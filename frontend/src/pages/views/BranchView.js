import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getBranches, getCommitsGraph, getDefaultBranch, compareBranches } from '../../api/githubApi';
import './BranchView.css';

// 그래프 설정 (GitKraken 스타일)
const GRAPH_CONFIG = {
    nodeRadius: 12,
    horizontalSpacing: 80,
    rowHeight: 80,
    leftPadding: 180,
    topPadding: 70,
    timelineHeight: 30,
    branchColors: [
        '#6e40c9', // purple
        '#2ea44f', // green
        '#0969da', // blue
        '#cf222e', // red
        '#bf8700', // yellow
        '#e85aad', // pink
        '#1a7f5a', // teal
        '#fa7a18', // orange
    ]
};

function BranchView({ team, loginMember }) {
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]);
    const [hiddenBranches, setHiddenBranches] = useState(new Set());
    const [soloMode, setSoloMode] = useState(false);
    const [defaultBranch, setDefaultBranch] = useState('main');
    const [commitsByBranch, setCommitsByBranch] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [depth, setDepth] = useState(100);
    const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'detailed'

    // 선택된 커밋 (상세 패널용)
    const [selectedCommit, setSelectedCommit] = useState(null);
    const [hoveredCommit, setHoveredCommit] = useState(null);

    // 검색
    const [searchQuery, setSearchQuery] = useState('');

    // 컨텍스트 메뉴
    const [contextMenu, setContextMenu] = useState(null);

    // 패닝/줌 상태
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const isGithubConnected = team?.githubRepoUrl && team.githubRepoUrl.trim() !== '';

    // 브랜치 목록 로드
    useEffect(() => {
        if (!isGithubConnected || !team?.teamId) return;

        const loadBranches = async () => {
            try {
                const [branchList, defaultBranchData] = await Promise.all([
                    getBranches(team.teamId),
                    getDefaultBranch(team.teamId)
                ]);
                setBranches(branchList);
                setDefaultBranch(defaultBranchData.defaultBranch || 'main');

                if (branchList.length > 0) {
                    const defaultName = defaultBranchData.defaultBranch || 'main';
                    // 기본 브랜치 + 최대 3개 추가 브랜치 선택
                    const initial = [defaultName, ...branchList
                        .map(b => b.name)
                        .filter(n => n !== defaultName)
                        .slice(0, 3)
                    ];
                    setSelectedBranches(initial);
                }
            } catch (err) {
                console.error('Failed to load branches:', err);
                setError('브랜치 목록을 불러오는데 실패했습니다.');
            }
        };

        loadBranches();
    }, [team?.teamId, isGithubConnected]);

    // 커밋 그래프 로드
    useEffect(() => {
        if (!isGithubConnected || !team?.teamId || selectedBranches.length === 0) {
            setLoading(false);
            return;
        }

        const loadGraph = async () => {
            setLoading(true);
            setError(null);
            try {
                // 보이는 브랜치만 로드
                const visibleBranches = selectedBranches.filter(b => !hiddenBranches.has(b));
                if (visibleBranches.length === 0) {
                    setCommitsByBranch({});
                    setLoading(false);
                    return;
                }

                const graphData = await getCommitsGraph(team.teamId, visibleBranches, depth);
                setCommitsByBranch(graphData.commitsByBranch || {});
            } catch (err) {
                console.error('Failed to load graph:', err);
                setError('커밋 그래프를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        loadGraph();
    }, [team?.teamId, selectedBranches, hiddenBranches, depth, isGithubConnected]);

    // 브랜치 토글
    const toggleBranch = (branchName) => {
        setSelectedBranches(prev => {
            if (prev.includes(branchName)) {
                if (prev.length === 1) return prev;
                return prev.filter(b => b !== branchName);
            }
            return [...prev, branchName];
        });
    };

    // 브랜치 숨기기
    const toggleHideBranch = (branchName) => {
        setHiddenBranches(prev => {
            const next = new Set(prev);
            if (next.has(branchName)) {
                next.delete(branchName);
            } else {
                next.add(branchName);
            }
            return next;
        });
    };

    // Solo 모드 (해당 브랜치만 표시)
    const soloBranch = (branchName) => {
        const allOthers = selectedBranches.filter(b => b !== branchName);
        if (soloMode && hiddenBranches.size === allOthers.length) {
            // Solo 해제
            setHiddenBranches(new Set());
            setSoloMode(false);
        } else {
            // Solo 활성화
            setHiddenBranches(new Set(allOthers));
            setSoloMode(true);
        }
    };

    // 그래프 크기 계산 (시간순 배치 기준)
    const getGraphBounds = useCallback(() => {
        // 모든 브랜치의 고유 커밋 수 계산
        const allShas = new Set();
        Object.values(commitsByBranch).forEach(commits => {
            commits.forEach(c => allShas.add(c.sha));
        });
        const totalUniqueCommits = Math.max(allShas.size, 1);
        const branchCount = Object.keys(commitsByBranch).length || 1;

        return {
            width: GRAPH_CONFIG.leftPadding + totalUniqueCommits * GRAPH_CONFIG.horizontalSpacing + 100,
            height: GRAPH_CONFIG.topPadding + branchCount * GRAPH_CONFIG.rowHeight + 40
        };
    }, [commitsByBranch]);

    // 패닝 범위 제한
    const constrainPan = useCallback((newPan, newZoom) => {
        const container = containerRef.current;
        if (!container) return newPan;

        const bounds = getGraphBounds();
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaledWidth = bounds.width * newZoom;
        const scaledHeight = bounds.height * newZoom;

        const minX = Math.min(0, containerWidth - scaledWidth - 20);
        const maxX = 20;
        const minY = Math.min(0, containerHeight - scaledHeight - 20);
        const maxY = 20;

        return {
            x: Math.max(minX, Math.min(maxX, newPan.x)),
            y: Math.max(minY, Math.min(maxY, newPan.y))
        };
    }, [getGraphBounds]);

    // 패닝 핸들러
    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        setContextMenu(null);
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    };

    const handleMouseMove = useCallback((e) => {
        if (!isPanning) return;
        const newPan = {
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y
        };
        setPan(constrainPan(newPan, zoom));
    }, [isPanning, zoom, constrainPan]);

    const handleMouseUp = () => setIsPanning(false);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom * delta, 0.5), 1.5);
        setZoom(newZoom);
        setPan(prev => constrainPan(prev, newZoom));
    };

    // 커밋 클릭
    const handleCommitClick = (node, e) => {
        e.stopPropagation();
        setSelectedCommit(node);
        setContextMenu(null);
    };

    // 우클릭 컨텍스트 메뉴
    const handleContextMenu = (node, e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = containerRef.current?.getBoundingClientRect();
        setContextMenu({
            x: e.clientX - (rect?.left || 0),
            y: e.clientY - (rect?.top || 0),
            commit: node.commit
        });
    };

    // 컨텍스트 메뉴 액션
    const contextMenuActions = [
        { label: 'GitHub에서 보기', icon: '↗', action: (c) => window.open(c.htmlUrl, '_blank') },
        { label: 'SHA 복사', icon: '📋', action: (c) => navigator.clipboard.writeText(c.sha) },
        { label: '메시지 복사', icon: '💬', action: (c) => navigator.clipboard.writeText(c.message) },
    ];

    // 검색 필터링
    const filterCommits = (commits) => {
        if (!searchQuery.trim()) return commits;
        const query = searchQuery.toLowerCase();
        return commits.filter(c =>
            c.message?.toLowerCase().includes(query) ||
            c.authorName?.toLowerCase().includes(query) ||
            c.authorLogin?.toLowerCase().includes(query) ||
            c.sha?.toLowerCase().includes(query)
        );
    };

    // 그래프 데이터 계산 (시간순 배치)
    const renderGraphData = () => {
        const nodes = [];
        const edges = [];
        const branchRows = {};

        let rowIndex = 0;
        const visibleBranches = selectedBranches.filter(b => !hiddenBranches.has(b));

        // 기본 브랜치가 먼저 오도록
        if (visibleBranches.includes(defaultBranch)) {
            branchRows[defaultBranch] = rowIndex++;
        }
        visibleBranches.forEach(branch => {
            if (branch !== defaultBranch && !branchRows.hasOwnProperty(branch)) {
                branchRows[branch] = rowIndex++;
            }
        });

        // 기본 브랜치의 커밋 SHA 목록 수집
        const defaultBranchShas = new Set();
        if (commitsByBranch[defaultBranch]) {
            commitsByBranch[defaultBranch].forEach(commit => {
                defaultBranchShas.add(commit.sha);
            });
        }

        // Overview 모드: 각 브랜치의 분기점과 HEAD만 표시
        if (viewMode === 'overview') {
            return renderOverviewGraph(branchRows, defaultBranchShas);
        }

        // Detailed 모드: 모든 커밋 표시 (기존 로직)
        const allCommits = [];

        // 기본 브랜치 커밋 추가
        if (commitsByBranch[defaultBranch] && !hiddenBranches.has(defaultBranch)) {
            const filteredCommits = filterCommits(commitsByBranch[defaultBranch]);
            filteredCommits.forEach(commit => {
                allCommits.push({ ...commit, branch: defaultBranch });
            });
        }

        // 다른 브랜치는 기본 브랜치에 없는 커밋만 추가
        Object.entries(commitsByBranch).forEach(([branch, commits]) => {
            if (hiddenBranches.has(branch) || branch === defaultBranch) return;
            const filteredCommits = filterCommits(commits);
            filteredCommits.forEach(commit => {
                if (!defaultBranchShas.has(commit.sha)) {
                    allCommits.push({ ...commit, branch });
                }
            });
        });

        // 날짜 기준 오름차순 정렬
        allCommits.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 중복 제거
        const seenShas = new Set();
        const uniqueCommits = [];
        allCommits.forEach(commit => {
            if (!seenShas.has(commit.sha)) {
                seenShas.add(commit.sha);
                uniqueCommits.push(commit);
            }
        });

        // 날짜별로 그룹화하여 X 위치 매핑 생성
        const getDateKey = (dateStr) => {
            if (!dateStr) return 'unknown';
            const d = new Date(dateStr);
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        };

        // 고유 날짜 목록 생성 (정렬 순서 유지)
        const uniqueDates = [];
        const seenDates = new Set();
        uniqueCommits.forEach(commit => {
            const dateKey = getDateKey(commit.date);
            if (!seenDates.has(dateKey)) {
                seenDates.add(dateKey);
                uniqueDates.push(dateKey);
            }
        });

        // 날짜별 X 위치 매핑
        const dateXPositions = {};
        uniqueDates.forEach((dateKey, index) => {
            dateXPositions[dateKey] = GRAPH_CONFIG.leftPadding + index * GRAPH_CONFIG.horizontalSpacing;
        });

        // 커밋별 X 위치 (같은 날짜는 같은 X 위치)
        const commitXPositions = {};
        uniqueCommits.forEach(commit => {
            const dateKey = getDateKey(commit.date);
            commitXPositions[commit.sha] = dateXPositions[dateKey] ?? GRAPH_CONFIG.leftPadding;
        });

        const commitPositions = {};

        // 기본 브랜치 노드 생성
        if (commitsByBranch[defaultBranch] && !hiddenBranches.has(defaultBranch)) {
            const filteredCommits = filterCommits(commitsByBranch[defaultBranch]);
            const row = branchRows[defaultBranch] ?? 0;
            const color = GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length];

            filteredCommits.forEach((commit) => {
                const x = commitXPositions[commit.sha] ?? GRAPH_CONFIG.leftPadding;
                const y = GRAPH_CONFIG.topPadding + row * GRAPH_CONFIG.rowHeight;

                commitPositions[commit.sha] = { x, y, branch: defaultBranch };
                nodes.push({ id: commit.sha, x, y, color, commit, branch: defaultBranch, row });
            });
        }

        // 다른 브랜치는 고유 커밋만 노드 생성
        Object.entries(commitsByBranch).forEach(([branch, commits]) => {
            if (hiddenBranches.has(branch) || branch === defaultBranch) return;

            const filteredCommits = filterCommits(commits);
            const row = branchRows[branch] ?? 0;
            const color = GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length];

            filteredCommits.forEach((commit) => {
                if (defaultBranchShas.has(commit.sha)) return;
                if (commitPositions[commit.sha]) return;

                const x = commitXPositions[commit.sha] ?? GRAPH_CONFIG.leftPadding;
                const y = GRAPH_CONFIG.topPadding + row * GRAPH_CONFIG.rowHeight;

                commitPositions[commit.sha] = { x, y, branch };
                nodes.push({ id: commit.sha, x, y, color, commit, branch, row });
            });
        });

        // 엣지 생성
        Object.entries(commitsByBranch).forEach(([branch, commits]) => {
            if (hiddenBranches.has(branch)) return;

            const filteredCommits = filterCommits(commits);
            filteredCommits.forEach((commit) => {
                if (commit.parents?.length > 0) {
                    commit.parents.forEach(parentSha => {
                        const fromPos = commitPositions[commit.sha];
                        const toPos = commitPositions[parentSha];

                        if (fromPos && toPos) {
                            const row = branchRows[fromPos.branch] ?? 0;
                            edges.push({
                                from: commit.sha,
                                to: parentSha,
                                fromX: fromPos.x,
                                fromY: fromPos.y,
                                toX: toPos.x,
                                toY: toPos.y,
                                color: GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length],
                                crossBranch: fromPos.branch !== toPos.branch
                            });
                        }
                    });
                }
            });
        });

        return { nodes, edges, branchRows };
    };

    // Overview 모드: 각 브랜치의 분기점과 HEAD만 표시
    const renderOverviewGraph = (branchRows, defaultBranchShas) => {
        const nodes = [];
        const edges = [];
        const commitPositions = {};

        // 각 브랜치별 중요 커밋 수집 (분기점, HEAD)
        const keyCommits = [];

        // 기본 브랜치: 첫 커밋과 마지막 커밋
        if (commitsByBranch[defaultBranch] && !hiddenBranches.has(defaultBranch)) {
            const commits = commitsByBranch[defaultBranch];
            if (commits.length > 0) {
                // HEAD (가장 최신)
                keyCommits.push({ ...commits[0], branch: defaultBranch, type: 'head' });
                // 가장 오래된 커밋
                if (commits.length > 1) {
                    keyCommits.push({ ...commits[commits.length - 1], branch: defaultBranch, type: 'start' });
                }
            }
        }

        // 다른 브랜치: 분기점(master에 있는 가장 최신 커밋)과 HEAD
        Object.entries(commitsByBranch).forEach(([branch, commits]) => {
            if (hiddenBranches.has(branch) || branch === defaultBranch) return;
            if (commits.length === 0) return;

            // HEAD (가장 최신, master에 없는 것)
            const uniqueCommits = commits.filter(c => !defaultBranchShas.has(c.sha));
            if (uniqueCommits.length > 0) {
                keyCommits.push({ ...uniqueCommits[0], branch, type: 'head' });

                // 분기점 (master에 있는 가장 최신 커밋 = 가장 최근 공통 조상)
                const branchPoint = commits.find(c => defaultBranchShas.has(c.sha));
                if (branchPoint) {
                    keyCommits.push({ ...branchPoint, branch: defaultBranch, type: 'branchpoint', forBranch: branch });
                }
            }
        });

        // 날짜 기준 정렬
        keyCommits.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 중복 제거 및 X 위치 할당
        const seenShas = new Set();
        const uniqueKeyCommits = [];
        keyCommits.forEach(commit => {
            if (!seenShas.has(commit.sha)) {
                seenShas.add(commit.sha);
                uniqueKeyCommits.push(commit);
            }
        });

        // 날짜별로 그룹화하여 X 위치 매핑 생성
        const getDateKey = (dateStr) => {
            if (!dateStr) return 'unknown';
            const d = new Date(dateStr);
            return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        };

        // 고유 날짜 목록 생성
        const uniqueDates = [];
        const seenDates = new Set();
        uniqueKeyCommits.forEach(commit => {
            const dateKey = getDateKey(commit.date);
            if (!seenDates.has(dateKey)) {
                seenDates.add(dateKey);
                uniqueDates.push(dateKey);
            }
        });

        // 날짜별 X 위치 매핑
        const dateXPositions = {};
        uniqueDates.forEach((dateKey, index) => {
            dateXPositions[dateKey] = GRAPH_CONFIG.leftPadding + index * GRAPH_CONFIG.horizontalSpacing * 2;
        });

        // 커밋별 X 위치 (같은 날짜는 같은 X 위치)
        const commitXPositions = {};
        uniqueKeyCommits.forEach(commit => {
            const dateKey = getDateKey(commit.date);
            commitXPositions[commit.sha] = dateXPositions[dateKey] ?? GRAPH_CONFIG.leftPadding;
        });

        // 노드 생성
        uniqueKeyCommits.forEach(commit => {
            const row = branchRows[commit.branch] ?? 0;
            const color = GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length];
            const x = commitXPositions[commit.sha];
            const y = GRAPH_CONFIG.topPadding + row * GRAPH_CONFIG.rowHeight;

            commitPositions[commit.sha] = { x, y, branch: commit.branch };
            nodes.push({
                id: commit.sha,
                x, y, color,
                commit,
                branch: commit.branch,
                row,
                type: commit.type
            });
        });

        // 엣지 생성: 같은 브랜치 내 연결 + 분기점 연결
        const branchHeads = {};
        const branchStarts = {};

        nodes.forEach(node => {
            if (node.type === 'head') {
                branchHeads[node.branch] = node;
            }
            if (node.type === 'start' || node.type === 'branchpoint') {
                if (!branchStarts[node.branch] || new Date(node.commit.date) < new Date(branchStarts[node.branch].commit.date)) {
                    branchStarts[node.branch] = node;
                }
            }
        });

        // 기본 브랜치 라인
        if (branchHeads[defaultBranch] && branchStarts[defaultBranch]) {
            const row = branchRows[defaultBranch] ?? 0;
            edges.push({
                from: branchHeads[defaultBranch].id,
                to: branchStarts[defaultBranch].id,
                fromX: branchHeads[defaultBranch].x,
                fromY: branchHeads[defaultBranch].y,
                toX: branchStarts[defaultBranch].x,
                toY: branchStarts[defaultBranch].y,
                color: GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length],
                crossBranch: false
            });
        }

        // 다른 브랜치 라인 + 분기점 연결
        Object.keys(branchRows).forEach(branch => {
            if (branch === defaultBranch) return;

            const head = branchHeads[branch];
            if (!head) return;

            // 분기점 찾기
            const branchCommits = commitsByBranch[branch] || [];
            const branchPoint = branchCommits.find(c => defaultBranchShas.has(c.sha));

            if (branchPoint && commitPositions[branchPoint.sha]) {
                const branchPointPos = commitPositions[branchPoint.sha];
                const row = branchRows[branch] ?? 0;
                const color = GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length];

                // 분기점에서 HEAD까지
                edges.push({
                    from: head.id,
                    to: branchPoint.sha,
                    fromX: head.x,
                    fromY: head.y,
                    toX: branchPointPos.x,
                    toY: branchPointPos.y,
                    color,
                    crossBranch: true
                });
            }
        });

        return { nodes, edges, branchRows };
    };

    // 배경 클릭 시 선택 해제
    const handleBackgroundClick = () => {
        setSelectedCommit(null);
        setContextMenu(null);
    };

    if (!isGithubConnected) {
        return (
            <div className="branch-view dark">
                <div className="branch-view-empty">
                    <div className="empty-icon">🔗</div>
                    <h3>GitHub 저장소 연결 필요</h3>
                    <p>브랜치 시각화를 위해 GitHub 저장소를 연결해주세요.</p>
                </div>
            </div>
        );
    }

    const { nodes, edges, branchRows } = renderGraphData();

    return (
        <div className="branch-view dark" onClick={handleBackgroundClick}>
            {/* 좌측 브랜치 패널 */}
            <div className="branch-panel">
                <div className="panel-header">
                    <span className="panel-title">BRANCHES</span>
                    <span className="branch-count">{branches.length}</span>
                </div>
                <div className="branch-list">
                    {branches.map((branch, idx) => {
                        const isSelected = selectedBranches.includes(branch.name);
                        const isHidden = hiddenBranches.has(branch.name);
                        const color = isSelected
                            ? GRAPH_CONFIG.branchColors[selectedBranches.indexOf(branch.name) % GRAPH_CONFIG.branchColors.length]
                            : '#6e7681';

                        return (
                            <div
                                key={branch.name}
                                className={`branch-item ${isSelected ? 'selected' : ''} ${isHidden ? 'hidden' : ''}`}
                            >
                                <div
                                    className="branch-color-bar"
                                    style={{ background: color }}
                                />
                                <span
                                    className="branch-name"
                                    onClick={() => toggleBranch(branch.name)}
                                >
                                    {branch.name}
                                    {branch.name === defaultBranch && (
                                        <span className="default-badge">default</span>
                                    )}
                                </span>
                                <div className="branch-actions">
                                    <button
                                        className={`action-btn ${isHidden ? 'active' : ''}`}
                                        onClick={() => toggleHideBranch(branch.name)}
                                        title="Hide"
                                    >
                                        👁
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => soloBranch(branch.name)}
                                        title="Solo"
                                    >
                                        ◎
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 메인 그래프 영역 */}
            <div className="graph-main">
                {/* 상단 툴바 */}
                <div className="graph-toolbar">
                    <div className="toolbar-left">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="커밋 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')}>✕</button>
                            )}
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value)}
                            className="depth-select"
                        >
                            <option value="overview">Overview</option>
                            <option value="detailed">Detailed</option>
                        </select>
                        {viewMode === 'detailed' && (
                            <select
                                value={depth}
                                onChange={(e) => setDepth(Number(e.target.value))}
                                className="depth-select"
                            >
                                <option value={30}>30 commits</option>
                                <option value={50}>50 commits</option>
                                <option value={100}>100 commits</option>
                                <option value={200}>200 commits</option>
                            </select>
                        )}
                        <button
                            className="toolbar-btn"
                            onClick={() => { setZoom(1); setPan(constrainPan({ x: 0, y: 0 }, 1)); }}
                        >
                            Reset View
                        </button>
                        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                    </div>
                </div>

                {/* 그래프 */}
                <div className="graph-content">
                    {loading ? (
                        <div className="graph-loading">
                            <div className="spinner" />
                            <span>Loading graph...</span>
                        </div>
                    ) : error ? (
                        <div className="graph-error">
                            <span>⚠️ {error}</span>
                        </div>
                    ) : (
                        <div
                            className="graph-viewport"
                            ref={containerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onWheel={handleWheel}
                        >
                            <svg
                                className="git-graph-svg"
                                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                            >
                                <defs>
                                    {/* 드롭 쉐도우 필터 */}
                                    {GRAPH_CONFIG.branchColors.map((color, i) => (
                                        <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
                                            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={color} floodOpacity="0.3" />
                                        </filter>
                                    ))}
                                </defs>

                                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                                    {/* 타임라인 */}
                                    {(() => {
                                        // 노드들의 날짜와 X 위치를 수집
                                        const datePositions = nodes
                                            .filter(n => n.commit.date)
                                            .map(n => ({
                                                date: new Date(n.commit.date),
                                                x: n.x
                                            }))
                                            .sort((a, b) => a.date - b.date);

                                        if (datePositions.length === 0) return null;

                                        // 날짜별로 그룹화 (같은 날짜는 하나만)
                                        const dateMarkers = [];
                                        let lastDateStr = '';
                                        datePositions.forEach(dp => {
                                            const dateStr = `${dp.date.getMonth() + 1}/${dp.date.getDate()}`;
                                            if (dateStr !== lastDateStr) {
                                                dateMarkers.push({ dateStr, x: dp.x, date: dp.date });
                                                lastDateStr = dateStr;
                                            }
                                        });

                                        const timelineY = 20;
                                        const minX = Math.min(...nodes.map(n => n.x)) - 10;
                                        const maxX = Math.max(...nodes.map(n => n.x)) + 10;

                                        return (
                                            <g className="timeline">
                                                {/* 타임라인 축 */}
                                                <line
                                                    x1={minX}
                                                    y1={timelineY}
                                                    x2={maxX}
                                                    y2={timelineY}
                                                    stroke="#cbd5e1"
                                                    strokeWidth={1}
                                                />
                                                {/* 날짜 마커 */}
                                                {dateMarkers.map((marker, idx) => (
                                                    <g key={idx}>
                                                        {/* 눈금선 */}
                                                        <line
                                                            x1={marker.x}
                                                            y1={timelineY - 4}
                                                            x2={marker.x}
                                                            y2={timelineY + 4}
                                                            stroke="#94a3b8"
                                                            strokeWidth={1}
                                                        />
                                                        {/* 날짜 텍스트 */}
                                                        <text
                                                            x={marker.x}
                                                            y={timelineY - 10}
                                                            textAnchor="middle"
                                                            fill="#64748b"
                                                            fontSize="10"
                                                            fontWeight="500"
                                                        >
                                                            {marker.dateStr}
                                                        </text>
                                                    </g>
                                                ))}
                                            </g>
                                        );
                                    })()}

                                    {/* 브랜치 라인 배경 */}
                                    {Object.entries(branchRows).map(([branch, row]) => {
                                        // 해당 브랜치의 노드들에서 X 범위 찾기
                                        const branchNodes = nodes.filter(n => n.branch === branch);
                                        if (branchNodes.length === 0) return null;

                                        const xPositions = branchNodes.map(n => n.x);
                                        const minX = Math.min(...xPositions);
                                        const maxX = Math.max(...xPositions);

                                        const y = GRAPH_CONFIG.topPadding + row * GRAPH_CONFIG.rowHeight;
                                        const startX = minX - 10;
                                        const endX = maxX;
                                        const color = GRAPH_CONFIG.branchColors[row % GRAPH_CONFIG.branchColors.length];

                                        return (
                                            <g key={`branch-bg-${branch}`}>
                                                <line
                                                    x1={startX}
                                                    y1={y}
                                                    x2={endX}
                                                    y2={y}
                                                    stroke={color}
                                                    strokeWidth={2}
                                                    strokeOpacity={0.2}
                                                />
                                                {/* 브랜치 이름 */}
                                                <text
                                                    x={10}
                                                    y={y + 4}
                                                    className="branch-label-text"
                                                    fill={color}
                                                >
                                                    {branch.length > 18 ? branch.substring(0, 18) + '...' : branch}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* 연결선 */}
                                    {edges.map((edge, index) => {
                                        const row = Object.values(branchRows).find((_, i) =>
                                            Object.keys(branchRows)[i] === nodes.find(n => n.id === edge.from)?.branch
                                        ) ?? 0;

                                        if (edge.fromY === edge.toY) {
                                            // 같은 행: 직선
                                            return (
                                                <line
                                                    key={`edge-${index}`}
                                                    x1={edge.fromX}
                                                    y1={edge.fromY}
                                                    x2={edge.toX}
                                                    y2={edge.toY}
                                                    stroke={edge.color}
                                                    strokeWidth={3}
                                                    filter={`url(#glow-${row % GRAPH_CONFIG.branchColors.length})`}
                                                />
                                            );
                                        } else {
                                            // 다른 행: 계단식 (step)
                                            const midX = (edge.fromX + edge.toX) / 2;
                                            return (
                                                <path
                                                    key={`edge-${index}`}
                                                    d={`M ${edge.fromX} ${edge.fromY}
                                                        H ${midX}
                                                        V ${edge.toY}
                                                        H ${edge.toX}`}
                                                    stroke={edge.color}
                                                    strokeWidth={3}
                                                    fill="none"
                                                    strokeOpacity={0.7}
                                                />
                                            );
                                        }
                                    })}

                                    {/* 커밋 노드 */}
                                    {nodes.map(node => {
                                        const isSelected = selectedCommit?.id === node.id;
                                        const isHovered = hoveredCommit?.id === node.id;
                                        const initial = (node.commit.authorLogin || node.commit.authorName || '?')[0].toUpperCase();

                                        return (
                                            <g
                                                key={node.id}
                                                className={`commit-node ${isSelected ? 'selected' : ''}`}
                                                onClick={(e) => handleCommitClick(node, e)}
                                                onContextMenu={(e) => handleContextMenu(node, e)}
                                                onMouseEnter={() => setHoveredCommit(node)}
                                                onMouseLeave={() => setHoveredCommit(null)}
                                            >
                                                {/* 선택 링 */}
                                                {isSelected && (
                                                    <circle
                                                        cx={node.x}
                                                        cy={node.y}
                                                        r={GRAPH_CONFIG.nodeRadius + 6}
                                                        fill="none"
                                                        stroke={node.color}
                                                        strokeWidth={3}
                                                        opacity={0.5}
                                                    />
                                                )}
                                                {/* 노드 */}
                                                <circle
                                                    cx={node.x}
                                                    cy={node.y}
                                                    r={GRAPH_CONFIG.nodeRadius}
                                                    fill={node.color}
                                                    stroke="white"
                                                    strokeWidth={3}
                                                    filter={`url(#glow-${node.row % GRAPH_CONFIG.branchColors.length})`}
                                                    className="node-circle"
                                                />
                                                {/* 이니셜 */}
                                                <text
                                                    x={node.x}
                                                    y={node.y + 5}
                                                    className="node-initial"
                                                    textAnchor="middle"
                                                    fill="#fff"
                                                    fontSize="11"
                                                    fontWeight="bold"
                                                >
                                                    {initial}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </g>
                            </svg>

                            {/* 호버 툴팁 */}
                            {hoveredCommit && !selectedCommit && (
                                <div
                                    className="commit-tooltip"
                                    style={{
                                        left: (hoveredCommit.x * zoom + pan.x) + 20,
                                        top: (hoveredCommit.y * zoom + pan.y) - 10
                                    }}
                                >
                                    <div className="tooltip-sha">{hoveredCommit.commit.shortSha}</div>
                                    <div className="tooltip-message">{hoveredCommit.commit.message}</div>
                                    <div className="tooltip-author">
                                        {hoveredCommit.commit.authorLogin || hoveredCommit.commit.authorName}
                                    </div>
                                </div>
                            )}

                            {/* 컨텍스트 메뉴 */}
                            {contextMenu && (
                                <div
                                    className="context-menu"
                                    style={{ left: contextMenu.x, top: contextMenu.y }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {contextMenuActions.map((action, i) => (
                                        <button
                                            key={i}
                                            className="context-menu-item"
                                            onClick={() => {
                                                action.action(contextMenu.commit);
                                                setContextMenu(null);
                                            }}
                                        >
                                            <span className="menu-icon">{action.icon}</span>
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 우측 상세 패널 */}
            {selectedCommit && (
                <div className="detail-panel">
                    <div className="detail-header">
                        <span className="detail-title">Commit Details</span>
                        <button className="close-btn" onClick={() => setSelectedCommit(null)}>✕</button>
                    </div>
                    <div className="detail-content">
                        <div className="detail-section">
                            <div className="detail-sha">
                                <span className="sha-badge" style={{ background: selectedCommit.color }}>
                                    {selectedCommit.commit.shortSha}
                                </span>
                                <button
                                    className="copy-btn"
                                    onClick={() => navigator.clipboard.writeText(selectedCommit.commit.sha)}
                                    title="Copy SHA"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                        <div className="detail-section">
                            <div className="detail-label">Message</div>
                            <div className="detail-message">{selectedCommit.commit.message}</div>
                        </div>
                        <div className="detail-section">
                            <div className="detail-label">Author</div>
                            <div className="detail-author">
                                <div className="author-avatar" style={{ background: selectedCommit.color }}>
                                    {(selectedCommit.commit.authorLogin || selectedCommit.commit.authorName || '?')[0].toUpperCase()}
                                </div>
                                <span>{selectedCommit.commit.authorLogin || selectedCommit.commit.authorName}</span>
                            </div>
                        </div>
                        {selectedCommit.commit.date && (
                            <div className="detail-section">
                                <div className="detail-label">Date</div>
                                <div className="detail-date">
                                    {new Date(selectedCommit.commit.date).toLocaleString('ko-KR')}
                                </div>
                            </div>
                        )}
                        <div className="detail-section">
                            <div className="detail-label">Branch</div>
                            <div className="detail-branch" style={{ color: selectedCommit.color }}>
                                {selectedCommit.branch}
                            </div>
                        </div>
                        <div className="detail-actions">
                            <button
                                className="action-button primary"
                                onClick={() => window.open(selectedCommit.commit.htmlUrl, '_blank')}
                            >
                                GitHub에서 보기 ↗
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BranchView;
