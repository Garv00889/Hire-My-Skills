import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, Paperclip, Send, ExternalLink, GitBranch,
  FileText, X, Users, ChevronRight,
  Lock, Clock, Crown, Layers, UserCheck, Plus, GitCommit,
  ShieldAlert, Activity, Sparkles, CheckCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  getMyProjects, getProjectById, getMessages, uploadChatFile,
  getProjectCommits, updateProjectGit
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import './ChatPage.css';

const ChatPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [myProjects, setMyProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Multi-user typing state: Array of user names currently typing
  const [typingUsers, setTypingUsers] = useState([]);

  // Multi-user real-time presence: Array of online users in current project room
  const [onlineMembers, setOnlineMembers] = useState([]);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Git Repository states
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [gitModalOpen, setGitModalOpen] = useState(false);
  const [gitRepoInput, setGitRepoInput] = useState('');
  const [savingGit, setSavingGit] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Fetch all projects user belongs to (for sidebar)
  const fetchMyProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const { data } = await getMyProjects();
      const projList = Array.isArray(data) ? data : [];
      setMyProjects(projList);

      // Auto-navigate to first project if no projectId in URL
      if (!projectId && projList.length > 0) {
        navigate(`/chat/${projList[0]._id}`, { replace: true });
      }
    } catch {
      setMyProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    fetchMyProjects();
  }, [fetchMyProjects]);

  // Load project metadata, messages, commits, and establish real-time socket room
  useEffect(() => {
    if (!token || !user || !projectId) return;

    let activeSocket = null;

    const initProjectChat = async () => {
      try {
        setLoadingMessages(true);
        setIsAuthorized(true);

        // 1. Fetch Project Details
        const { data: projData } = await getProjectById(projectId);
        setProject(projData);

        // Check if current user is authorized (creator or in members)
        const isMember =
          projData.creator?._id === user._id ||
          projData.creator === user._id ||
          (projData.members || []).some(
            (m) => (m._id || m).toString() === user._id.toString()
          );

        if (!isMember) {
          setIsAuthorized(false);
          setLoadingMessages(false);
          return;
        }

        // 2. Fetch Chat History
        const { data: msgData } = await getMessages(projectId);
        setMessages(Array.isArray(msgData) ? msgData : []);

        // 3. Fetch Git Commits
        fetchCommits(projectId);

        // 4. Connect Socket.IO for Multi-User Real-Time Sync
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        activeSocket = io(socketUrl, {
          auth: { token },
          withCredentials: true,
          transports: ['websocket', 'polling'],
        });

        setSocket(activeSocket);

        // Join project room with user presence info
        activeSocket.emit('join-project', {
          projectId,
          user: {
            _id: user._id,
            name: user.name,
            profilePicture: user.profilePicture || '',
          },
        });

        // Listen for new incoming messages from any project member in real-time
        activeSocket.on('receive-message', (msg) => {
          setMessages((prev) => {
            // Avoid duplicate message appending
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        });

        // Listen for multi-user online presence updates
        activeSocket.on('project-users-online', (data) => {
          if (data && data.projectId === projectId) {
            setOnlineMembers(data.onlineUsers || []);
          }
        });

        // Listen for multi-user typing events
        activeSocket.on('user-typing', ({ userId, userName }) => {
          if (userId !== user._id) {
            setTypingUsers((prev) => {
              if (prev.includes(userName)) return prev;
              return [...prev, userName];
            });
          }
        });

        activeSocket.on('user-stop-typing', ({ userName }) => {
          setTypingUsers((prev) => prev.filter((name) => name !== userName));
        });

        activeSocket.on('error-message', ({ message }) => {
          toast.error(message || 'Access restricted');
          setIsAuthorized(false);
        });
      } catch (err) {
        if (err.response?.status === 403) {
          setIsAuthorized(false);
        } else {
          toast.error('Failed to load project chat space');
        }
      } finally {
        setLoadingMessages(false);
      }
    };

    initProjectChat();

    return () => {
      if (activeSocket) {
        activeSocket.emit('leave-project', { projectId });
        activeSocket.disconnect();
      }
      setTypingUsers([]);
      setOnlineMembers([]);
    };
  }, [projectId, user, token]);

  // Auto-scroll on new messages or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const fetchCommits = async (pId) => {
    try {
      setLoadingCommits(true);
      const { data } = await getProjectCommits(pId || projectId);
      setCommits(data.commits || []);
    } catch {
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleConnectGit = async (e) => {
    e.preventDefault();
    if (!gitRepoInput.trim()) return;

    setSavingGit(true);
    try {
      const { data } = await updateProjectGit(projectId, {
        githubRepo: gitRepoInput.trim(),
      });
      setProject(data.project);
      toast.success('GitHub Repository connected to project.');
      setGitModalOpen(false);
      fetchCommits(projectId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect repository');
    } finally {
      setSavingGit(false);
    }
  };

  // Send message to the project group chat
  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !isAuthorized) return;

    socket.emit('send-message', {
      projectId,
      senderId: user._id,
      content: newMessage.trim(),
    });

    socket.emit('stop-typing', {
      projectId,
      userId: user._id,
      userName: user.name,
    });
    setNewMessage('');
  };

  // Handle typing with debounced stop-typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !isAuthorized) return;

    socket.emit('typing', {
      projectId,
      userId: user._id,
      userName: user.name,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', {
        projectId,
        userId: user._id,
        userName: user.name,
      });
    }, 1800);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !isAuthorized) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await uploadChatFile(projectId, formData);
      toast.success('File shared with project team!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredProjects = myProjects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (cat) => {
    const colors = {
      webdev: '#3B82F6',
      AI: '#8B5CF6',
      'UI/UX': '#EC4899',
      'college project': '#10B981',
      business: '#F59E0B',
      corporate: '#6366F1',
      other: '#6B7280',
    };
    return colors[cat] || '#6B7280';
  };

  const getLevelInitial = (level) => {
    return { beginner: 'B', intermediate: 'I', advanced: 'A' }[level] || '?';
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const diff = Math.floor((today - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = formatDate(msg.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  // Check if a member is currently online in this project room
  const isMemberOnline = (memberId) => {
    const mIdStr = (memberId?._id || memberId || '').toString();
    return onlineMembers.some((u) => u.userId.toString() === mIdStr);
  };

  // Multi-user typing message formulation
  const getTypingMessage = () => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;
  };

  const totalMembers = project?.members?.length || 0;
  const capacityLimit = project?.membersRequired || 3;
  const isOwner =
    project?.creator?._id === user?._id || project?.creator === user?._id;

  return (
    <div className="chat-page page-enter">
      <Navbar />

      <div className="chat-layout">
        {/* ========== LEFT SIDEBAR: Project Rooms ========== */}
        <aside className="chat-sidebar">
          <div className="sidebar-top">
            <div className="chat-search-box">
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search team spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="project-rooms-list">
            {loadingProjects ? (
              <div className="rooms-loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="room-skeleton">
                    <div className="skeleton skel-icon" />
                    <div className="skeleton skel-text" />
                  </div>
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="no-rooms-state">
                <Layers size={28} color="var(--gold)" />
                <p>No project chats yet</p>
                <small>
                  Join or create a project to collaborate in team chat
                </small>
                <Link
                  to="/explore"
                  className="btn-primary"
                  style={{ marginTop: 12, fontSize: 13, padding: '8px 16px' }}
                >
                  Explore Projects
                </Link>
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isActive = p._id === projectId;
                const memberCount = p.members?.length || 0;
                const maxSeats = p.membersRequired || 3;
                return (
                  <div
                    key={p._id}
                    className={`room-item ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(`/chat/${p._id}`)}
                  >
                    <div
                      className="room-icon"
                      style={{
                        background: `${getCategoryColor(p.category)}18`,
                        color: getCategoryColor(p.category),
                      }}
                    >
                      {p.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="room-info">
                      <div className="room-name">{p.title}</div>
                      <div className="room-meta">
                        <Users size={11} />
                        <span>
                          {memberCount}/{maxSeats} seats
                        </span>
                        <span className="meta-dot">•</span>
                        <span className={`level-tag ${p.level}`}>
                          {getLevelInitial(p.level)}
                        </span>
                      </div>
                    </div>
                    {isActive && <ChevronRight size={14} color="var(--gold)" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="sidebar-bottom">
            <Link to="/explore" className="explore-rooms-btn">
              <Search size={14} /> Explore Projects
            </Link>
          </div>
        </aside>

        {/* ========== CENTER: Chat Messages & Multi-User Experience ========== */}
        <main className="chat-main">
          {!projectId ? (
            <div className="chat-empty-state">
              <div className="chat-empty-icon">
                <MessageSquare size={32} color="var(--gold)" />
              </div>
              <h3>Select a project chat</h3>
              <p>
                Choose a project space from the sidebar to collaborate with your team in real time.
              </p>
            </div>
          ) : !isAuthorized ? (
            <div className="chat-empty-state unauthorized-state">
              <div className="chat-empty-icon" style={{ background: 'rgba(244,67,54,0.1)' }}>
                <ShieldAlert size={36} color="#C62828" />
              </div>
              <h3 style={{ color: '#C62828' }}>Project Chat Restricted</h3>
              <p style={{ maxWidth: 440, margin: '8px auto 20px' }}>
                Only verified project members and the creator can access this project's team chat space. Submit an application to request access.
              </p>
              <Link to="/explore" className="btn-primary" style={{ padding: '10px 22px' }}>
                Explore Available Projects
              </Link>
            </div>
          ) : (
            <>
              {/* Chat Header with Live Multi-User Info */}
              <div className="chat-header">
                <div className="chat-header-left">
                  {project && (
                    <>
                      <div
                        className="chat-room-icon"
                        style={{
                          background: `${getCategoryColor(project.category)}18`,
                          color: getCategoryColor(project.category),
                        }}
                      >
                        {project.title.charAt(0)}
                      </div>
                      <div>
                        <div className="flex-center gap-8" style={{ justifyContent: 'flex-start' }}>
                          <h2 className="chat-room-title">{project.title}</h2>
                          <span
                            className="chat-capacity-pill"
                            title={`Project capacity: up to ${capacityLimit} members`}
                          >
                            <Users size={11} /> {totalMembers}/{capacityLimit} Team
                          </span>
                        </div>
                        <p className="chat-room-sub">
                          <span className="online-dot pulsing" />
                          <strong style={{ color: '#2E7D32' }}>
                            {onlineMembers.length} active now
                          </strong>{' '}
                          · {totalMembers} total members
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="chat-header-right">
                  {/* Multi-user live avatars in header */}
                  <div className="header-online-avatars" title="Active users in this project chat">
                    {onlineMembers.slice(0, 4).map((u, i) => (
                      <div
                        key={u.userId || i}
                        className="header-avatar-circle"
                        title={`${u.name} (Active in chat)`}
                      >
                        {u.profilePicture ? (
                          <img src={u.profilePicture} alt={u.name} />
                        ) : (
                          u.name?.[0] || '?'
                        )}
                      </div>
                    ))}
                    {onlineMembers.length > 4 && (
                      <span className="header-more-count">+{onlineMembers.length - 4}</span>
                    )}
                  </div>

                  <Link
                    to="/explore"
                    className="header-action-btn"
                    title="View Explore Details"
                  >
                    <ExternalLink size={16} />
                  </Link>
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages-area">
                {/* Project Welcome Banner */}
                {project && (
                  <div className="chat-welcome-banner">
                    <div
                      className="welcome-icon"
                      style={{
                        background: `${getCategoryColor(project.category)}18`,
                        color: getCategoryColor(project.category),
                      }}
                    >
                      {project.title.charAt(0)}
                    </div>
                    <h3>{project.title}</h3>
                    <p>
                      {project.category} · {project.level} level · {capacityLimit} member capacity
                    </p>
                    <p className="welcome-desc">
                      {project.description?.substring(0, 140)}...
                    </p>
                    <div className="welcome-lock">
                      <Lock size={12} /> Real-time team space for authorized members. All messages and shared files sync instantly.
                    </div>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="messages-loading">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`msg-skeleton ${i % 2 === 0 ? 'mine' : ''}`}
                      >
                        <div className="skeleton skel-avatar" />
                        <div className="skeleton skel-bubble" />
                      </div>
                    ))}
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([date, dayMessages]) => (
                    <div key={date}>
                      <div className="date-divider">
                        <span>{date}</span>
                      </div>
                      {dayMessages.map((msg, idx) => {
                        const senderId =
                          msg.sender?._id || msg.sender;
                        const isMine =
                          senderId === user._id || senderId?.toString() === user._id?.toString();
                        const isMsgCreator =
                          senderId === project?.creator?._id ||
                          senderId === project?.creator ||
                          senderId?.toString() === (project?.creator?._id || project?.creator)?.toString();

                        const showAvatar =
                          !isMine &&
                          (idx === 0 ||
                            (dayMessages[idx - 1]?.sender?._id || dayMessages[idx - 1]?.sender)?.toString() !== senderId?.toString());

                        return (
                          <div
                            key={msg._id || idx}
                            className={`message-row ${isMine ? 'mine' : 'theirs'}`}
                          >
                            {!isMine && (
                              <div className="msg-avatar">
                                {showAvatar ? (
                                  msg.sender?.profilePicture ? (
                                    <img
                                      src={msg.sender.profilePicture}
                                      alt=""
                                    />
                                  ) : (
                                    <span>{msg.sender?.name?.[0] || '?'}</span>
                                  )
                                ) : (
                                  <span style={{ opacity: 0 }}>·</span>
                                )}
                              </div>
                            )}

                            <div className="message-group">
                              {!isMine && showAvatar && (
                                <div className="flex-center gap-6" style={{ justifyContent: 'flex-start', marginBottom: 2 }}>
                                  <span className="msg-sender-name">
                                    {msg.sender?.name}
                                  </span>
                                  {isMsgCreator && (
                                    <span className="creator-msg-tag">
                                      <Crown size={9} /> Owner
                                    </span>
                                  )}
                                </div>
                              )}

                              <div
                                className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}
                              >
                                {msg.isFile ? (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="file-attachment-bubble"
                                  >
                                    <FileText size={18} />
                                    <span>{msg.fileName || 'Shared File'}</span>
                                    <ExternalLink size={12} />
                                  </a>
                                ) : (
                                  <p>{msg.content}</p>
                                )}
                              </div>
                              <span className="msg-time">
                                {formatTime(msg.createdAt)}
                                {isMine && <CheckCheck size={12} color="var(--gold-dark)" style={{ marginLeft: 3 }} />}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

                {/* Multi-User Typing Indicator */}
                {typingUsers.length > 0 && (
                  <div className="typing-row theirs">
                    <div className="msg-avatar">
                      <span>·</span>
                    </div>
                    <div className="typing-bubble">
                      <span className="typing-name">
                        {getTypingMessage()}
                      </span>
                      <div className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <div className="chat-input-bar">
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Attach File or Document"
                >
                  <Paperclip size={19} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  hidden
                  onChange={handleFileUpload}
                />

                <form className="chat-input-form" onSubmit={sendMessage}>
                  <input
                    type="text"
                    placeholder={
                      uploading
                        ? 'Uploading shared file to group...'
                        : 'Message project team members...'
                    }
                    value={newMessage}
                    onChange={handleTyping}
                    disabled={uploading}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className={`send-btn ${newMessage.trim() ? 'active' : ''}`}
                    disabled={!newMessage.trim() || uploading}
                    title="Send message (Enter)"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          )}
        </main>

        {/* ========== RIGHT PANEL: Team Details & Multi-User Presence ========== */}
        {project && isAuthorized && (
          <aside className="chat-details-panel">
            <div className="panel-section">
              <div
                className="panel-project-icon"
                style={{
                  background: `${getCategoryColor(project.category)}18`,
                  color: getCategoryColor(project.category),
                }}
              >
                {project.title.charAt(0)}
              </div>
              <h3 className="panel-project-title">{project.title}</h3>
              <span className="panel-category-badge">{project.category}</span>
              <p className="panel-desc">
                {project.description?.substring(0, 110)}...
              </p>
              <Link to="/explore" className="panel-view-link">
                Explore View <ChevronRight size={14} />
              </Link>
            </div>

            <div className="panel-divider" />

            {/* Team Members List with Live Presence & Capacity */}
            <div className="panel-section">
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <h4 className="panel-section-title" style={{ margin: 0 }}>
                  <Users size={14} /> Team ({totalMembers}/{capacityLimit})
                </h4>
                <span className="capacity-badge">
                  {capacityLimit - totalMembers > 0
                    ? `${capacityLimit - totalMembers} open seat${capacityLimit - totalMembers !== 1 ? 's' : ''}`
                    : 'Team Full'}
                </span>
              </div>

              <div className="members-list">
                {project.members?.map((m) => {
                  const mId = m._id || m;
                  const isCreatorMember =
                    mId === project.creator?._id ||
                    mId === project.creator ||
                    mId.toString() === (project.creator?._id || project.creator)?.toString();
                  const isMe = mId.toString() === user._id.toString();
                  const online = isMemberOnline(mId);

                  return (
                    <div key={mId} className="member-row">
                      <div className="member-avatar">
                        {m.profilePicture ? (
                          <img src={m.profilePicture} alt={m.name || ''} />
                        ) : (
                          <span>{m.name?.[0] || '?'}</span>
                        )}
                      </div>
                      <div className="member-details">
                        <span className="member-name">
                          {m.name || 'Member'} {isMe && <span className="you-tag">(You)</span>}
                        </span>
                        {isCreatorMember ? (
                          <span className="owner-tag">
                            <Crown size={10} /> Project Owner
                          </span>
                        ) : (
                          <span className="contributor-tag">
                            <Sparkles size={9} /> Member
                          </span>
                        )}
                      </div>

                      {/* Real-time Online Indicator */}
                      <span
                        className={`online-status-dot ${online ? 'online' : 'offline'}`}
                        title={online ? 'Active in chat' : 'Offline'}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Creator Actions: Review Applications */}
            {isOwner && (
              <>
                <div className="panel-divider" />
                <div className="panel-section">
                  <button
                    className="btn-primary full-w-btn flex-center gap-8"
                    onClick={() =>
                      navigate(`/projects/${projectId}/applications`)
                    }
                    style={{
                      borderRadius: 14,
                      fontSize: 13,
                      padding: '10px 16px',
                    }}
                  >
                    <UserCheck size={16} /> Review Applications & Members
                  </button>
                </div>
              </>
            )}

            {project.deadline?.end && (
              <>
                <div className="panel-divider" />
                <div className="panel-section">
                  <h4 className="panel-section-title">
                    <Clock size={14} /> Deadline
                  </h4>
                  <p className="panel-deadline">
                    {new Date(project.deadline.end).toLocaleDateString(
                      'en-IN',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                </div>
              </>
            )}

            {project.skillRequirements?.length > 0 && (
              <>
                <div className="panel-divider" />
                <div className="panel-section">
                  <h4 className="panel-section-title">Required Skills</h4>
                  <div className="skills-chips">
                    {project.skillRequirements.map((s) => (
                      <span key={s} className="skill-chip-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Git Repository Integration Section */}
            <div className="panel-divider" />
            <div className="panel-section">
              <div className="flex-between" style={{ marginBottom: 8 }}>
                <h4 className="panel-section-title" style={{ margin: 0 }}>
                  <GitBranch size={14} /> Git Repository
                </h4>
                {isOwner && (
                  <button
                    className="icon-link-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                    onClick={() => {
                      setGitRepoInput(project.githubRepo || '');
                      setGitModalOpen(true);
                    }}
                    title="Connect or Update GitHub Repo"
                  >
                    <Plus size={14} color="var(--gold-dark)" />
                  </button>
                )}
              </div>

              {project.githubRepo ? (
                <>
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="git-repo-link"
                  >
                    {project.githubRepo.replace('https://', '')}
                    <ExternalLink size={12} />
                  </a>

                  {/* Commits Activity Stream */}
                  <div className="git-commits-stream" style={{ marginTop: 12 }}>
                    <span
                      className="text-muted-sm"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Recent Activity
                    </span>
                    {loadingCommits ? (
                      <p className="text-muted-sm" style={{ marginTop: 6 }}>
                        Loading commits...
                      </p>
                    ) : commits.length > 0 ? (
                      <div
                        className="commits-list"
                        style={{
                          marginTop: 6,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {commits.map((c, i) => (
                          <div
                            key={i}
                            className="commit-item"
                            style={{
                              fontSize: 12,
                              padding: '6px 10px',
                              background: 'rgba(0,0,0,0.03)',
                              borderRadius: 8,
                            }}
                          >
                            <div className="flex-between">
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  color: 'var(--gold-dark)',
                                }}
                              >
                                <GitCommit size={11} /> {c.sha}
                              </span>
                              <span
                                style={{ fontSize: 10, color: 'var(--text-muted)' }}
                              >
                                {c.author}
                              </span>
                            </div>
                            <p
                              style={{
                                margin: '2px 0 0 0',
                                color: 'var(--text-secondary)',
                                fontSize: 11,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-sm" style={{ marginTop: 4 }}>
                        Repository connected for team collaboration.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className="empty-git-card"
                  style={{
                    padding: 12,
                    background: 'rgba(0,0,0,0.02)',
                    borderRadius: 12,
                  }}
                >
                  <p className="text-muted-sm" style={{ margin: 0 }}>
                    No Git repository linked yet.
                  </p>
                  {isOwner && (
                    <button
                      className="btn-secondary"
                      style={{
                        marginTop: 8,
                        width: '100%',
                        fontSize: 12,
                        padding: '6px 10px',
                      }}
                      onClick={() => {
                        setGitRepoInput('');
                        setGitModalOpen(true);
                      }}
                    >
                      <GitBranch size={13} /> Connect GitHub Repo
                    </button>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Connect Git Repo Modal */}
      {gitModalOpen && (
        <div className="modal-overlay" onClick={() => setGitModalOpen(false)}>
          <div
            className="edit-profile-modal page-enter"
            style={{ width: 440, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header flex-between"
              style={{ padding: 0, marginBottom: 16 }}
            >
              <h3>Connect Git Repository</h3>
              <button
                className="close-modal-btn"
                onClick={() => setGitModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleConnectGit}>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginBottom: 14,
                }}
              >
                Enter the GitHub repository URL to grant your team members shared access to code history and commits.
              </p>
              <input
                type="url"
                className="input-field-custom"
                placeholder="https://github.com/username/project-repo"
                value={gitRepoInput}
                onChange={(e) => setGitRepoInput(e.target.value)}
                required
              />
              <div className="flex-between" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setGitModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingGit}
                >
                  {savingGit ? 'Connecting...' : 'Connect Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
