package com.example.demo.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceService {

    private final SimpMessagingTemplate messagingTemplate;

    // teamId -> Set of online memberNo
    private final Map<Integer, Set<Integer>> teamOnlineMembers = new ConcurrentHashMap<>();

    // sessionId -> memberNo
    private final Map<String, Integer> sessionMemberMap = new ConcurrentHashMap<>();

    // sessionId -> Set of teamIds
    private final Map<String, Set<Integer>> sessionTeamsMap = new ConcurrentHashMap<>();

    public PresenceService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void userConnected(String sessionId, Integer memberNo) {
        sessionMemberMap.put(sessionId, memberNo);
        sessionTeamsMap.put(sessionId, ConcurrentHashMap.newKeySet());
    }

    public void userDisconnected(String sessionId) {
        Integer memberNo = sessionMemberMap.remove(sessionId);
        Set<Integer> teams = sessionTeamsMap.remove(sessionId);

        if (memberNo != null && teams != null) {
            for (Integer teamId : teams) {
                removeFromTeam(teamId, memberNo);
                broadcastPresence(teamId);
            }
        }
    }

    public void joinTeam(String sessionId, Integer teamId, Integer memberNo) {
        // Add to session's teams
        sessionTeamsMap.computeIfAbsent(sessionId, k -> ConcurrentHashMap.newKeySet()).add(teamId);

        // Add to team's online members
        teamOnlineMembers.computeIfAbsent(teamId, k -> ConcurrentHashMap.newKeySet()).add(memberNo);

        // Broadcast updated presence
        broadcastPresence(teamId);
    }

    public void leaveTeam(String sessionId, Integer teamId) {
        Integer memberNo = sessionMemberMap.get(sessionId);
        Set<Integer> teams = sessionTeamsMap.get(sessionId);

        if (teams != null) {
            teams.remove(teamId);
        }

        if (memberNo != null) {
            removeFromTeam(teamId, memberNo);
            broadcastPresence(teamId);
        }
    }

    private void removeFromTeam(Integer teamId, Integer memberNo) {
        Set<Integer> members = teamOnlineMembers.get(teamId);
        if (members != null) {
            members.remove(memberNo);
            if (members.isEmpty()) {
                teamOnlineMembers.remove(teamId);
            }
        }
    }

    public Set<Integer> getOnlineMembers(Integer teamId) {
        return teamOnlineMembers.getOrDefault(teamId, Collections.emptySet());
    }

    private void broadcastPresence(Integer teamId) {
        Set<Integer> onlineMembers = getOnlineMembers(teamId);
        Map<String, Object> event = Map.of(
                "eventType", "PRESENCE_UPDATE",
                "payload", onlineMembers
        );
        messagingTemplate.convertAndSend("/topic/team/" + teamId, event);
    }
}
