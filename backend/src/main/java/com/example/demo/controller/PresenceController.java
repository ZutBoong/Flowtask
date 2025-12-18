package com.example.demo.controller;

import com.example.demo.service.PresenceService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @MessageMapping("/presence/join/{teamId}")
    public void joinTeam(
            @DestinationVariable Integer teamId,
            @Payload Map<String, Integer> payload,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        String sessionId = headerAccessor.getSessionId();
        Integer memberNo = payload.get("memberNo");

        if (memberNo != null) {
            presenceService.userConnected(sessionId, memberNo);
            presenceService.joinTeam(sessionId, teamId, memberNo);
        }
    }

    @MessageMapping("/presence/leave/{teamId}")
    public void leaveTeam(
            @DestinationVariable Integer teamId,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        String sessionId = headerAccessor.getSessionId();
        presenceService.leaveTeam(sessionId, teamId);
    }
}
