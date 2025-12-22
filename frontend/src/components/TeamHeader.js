import React from 'react';
import './TeamHeader.css';

function TeamHeader({ team }) {
    return (
        <div className="team-header-section">
            <div className="team-header">
                <div className="team-icon-large">
                    {team?.teamName?.charAt(0) || 'T'}
                </div>
                <div className="team-title-area">
                    <h1 className="team-title">{team?.teamName || '팀 이름'}</h1>
                </div>
            </div>
            {team?.description && (
                <div className="team-description-area">
                    <p className="team-description">{team.description}</p>
                </div>
            )}
        </div>
    );
}

export default TeamHeader;
