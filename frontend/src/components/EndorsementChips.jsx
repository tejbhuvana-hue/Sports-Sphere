import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profilesAPI } from '../services/api';
import { CrownIcon, HandshakeIcon, ZapIcon, TargetIcon } from './common/Icons';

export const EndorsementChips = ({ playerId, endorsementsCounts = {}, userEndorsements = [], isOwnProfile }) => {
  const { user, isAuthenticated } = useAuth();
  const [counts, setCounts] = useState(endorsementsCounts);
  const [myEndorsements, setMyEndorsements] = useState(userEndorsements);
  const [loadingCategory, setLoadingCategory] = useState(null);

  const categories = [
    { key: 'LEADERSHIP', label: 'Leadership', icon: CrownIcon },
    { key: 'TEAMWORK', label: 'Teamwork', icon: HandshakeIcon },
    { key: 'FITNESS', label: 'Fitness', icon: ZapIcon },
    { key: 'SKILLS', label: 'Skills', icon: TargetIcon },
  ];

  const isCoach = isAuthenticated && user?.role === 'COACH' && !isOwnProfile;

  const handleToggle = async (catKey) => {
    if (!isCoach || loadingCategory) return;
    setLoadingCategory(catKey);
    try {
      const res = await profilesAPI.toggleEndorsement(playerId, catKey);
      setCounts((prev) => ({ ...prev, [catKey]: res.data.count }));
      if (res.data.endorsed) {
        setMyEndorsements((prev) => [...prev, catKey]);
      } else {
        setMyEndorsements((prev) => prev.filter((k) => k !== catKey));
      }
    } catch (err) {
      console.error('Endorsement toggle error', err);
    } finally {
      setLoadingCategory(null);
    }
  };

  return (
    <div className="coach-endorsements-grid">
      {categories.map(({ key, label, icon: IconComponent }) => {
        const count = counts[key] || 0;
        const endorsedByMe = myEndorsements.includes(key);

        return (
          <div
            key={key}
            onClick={() => isCoach && handleToggle(key)}
            className={`endorsement-box glass-panel ${endorsedByMe ? 'endorsed' : ''} ${isCoach ? 'clickable' : ''}`}
            title={isCoach ? (endorsedByMe ? `Click to remove endorsement for ${label}` : `Click to endorse for ${label}`) : `${label} Endorsements`}
          >
            <div className="endorsement-icon-wrap">
              <IconComponent size={22} className="endorsement-icon" />
            </div>
            <div className="endorsement-info">
              <span className="endorsement-label">{label}</span>
              <span className="endorsement-count">{count}</span>
            </div>
            {isCoach && (
              <span className="endorsement-action-chip">
                {endorsedByMe ? 'Endorsed ✓' : '+ Endorse'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
