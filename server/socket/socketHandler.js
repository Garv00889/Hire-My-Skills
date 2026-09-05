const Message = require('../models/Message');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

// Map of projectId -> Map(socketId -> { userId, name, profilePicture })
const projectRoomMembers = new Map();

// Map of socketId -> Set(projectIds)
const socketProjects = new Map();

const initSocket = (io) => {
  // Store io globally so controllers can access it
  global.io = io;

  io.on('connection', (socket) => {
    // Join user's personal room for direct notifications
    socket.on('join-user', (userId) => {
      if (userId) {
        socket.join(userId.toString());
      }
    });

    // Join a project group chat room with user info for real-time presence
    socket.on('join-project', async (payload) => {
      try {
        const projectId = typeof payload === 'object' ? payload.projectId : payload;
        const userData = typeof payload === 'object' ? payload.user : null;

        if (!projectId) return;

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) return;

        // If user data is provided, verify authorization
        if (userData && userData._id) {
          const userId = userData._id.toString();
          const isAuthorized =
            project.creator.toString() === userId ||
            project.members.some((m) => m.toString() === userId);

          if (!isAuthorized) {
            socket.emit('error-message', {
              message: 'You are not an authorized member of this project chat.',
            });
            return;
          }

          // Track in project room presence
          if (!projectRoomMembers.has(projectId.toString())) {
            projectRoomMembers.set(projectId.toString(), new Map());
          }

          projectRoomMembers.get(projectId.toString()).set(socket.id, {
            userId,
            name: userData.name || 'Member',
            profilePicture: userData.profilePicture || '',
          });

          if (!socketProjects.has(socket.id)) {
            socketProjects.set(socket.id, new Set());
          }
          socketProjects.get(socket.id).add(projectId.toString());
        }

        socket.join(projectId.toString());

        // Broadcast current active members list to this project room
        const roomMembers = projectRoomMembers.get(projectId.toString());
        const activeUsers = roomMembers
          ? Array.from(
              new Map(
                Array.from(roomMembers.values()).map((u) => [u.userId, u])
              ).values()
            )
          : [];

        io.to(projectId.toString()).emit('project-users-online', {
          projectId: projectId.toString(),
          onlineUsers: activeUsers,
          onlineCount: activeUsers.length,
        });
      } catch (err) {
        console.error('join-project error:', err.message);
      }
    });

    // Leave a project room
    socket.on('leave-project', (payload) => {
      const projectId = typeof payload === 'object' ? payload.projectId : payload;
      if (!projectId) return;

      socket.leave(projectId.toString());

      if (projectRoomMembers.has(projectId.toString())) {
        projectRoomMembers.get(projectId.toString()).delete(socket.id);
        const roomMembers = projectRoomMembers.get(projectId.toString());
        const activeUsers = roomMembers
          ? Array.from(
              new Map(
                Array.from(roomMembers.values()).map((u) => [u.userId, u])
              ).values()
            )
          : [];

        io.to(projectId.toString()).emit('project-users-online', {
          projectId: projectId.toString(),
          onlineUsers: activeUsers,
          onlineCount: activeUsers.length,
        });
      }

      if (socketProjects.has(socket.id)) {
        socketProjects.get(socket.id).delete(projectId.toString());
      }
    });

    // Send a chat message with multi-user real-time broadcast
    socket.on('send-message', async (data) => {
      try {
        const {
          projectId,
          senderId,
          content,
          fileUrl,
          fileName,
          fileType,
          isFile,
        } = data;
        if (!projectId || !senderId) return;

        // Verify sender is an authorized project member or creator
        const project = await Project.findById(projectId);
        if (!project) return;

        const isAuthorized =
          project.creator.toString() === senderId.toString() ||
          project.members.some((m) => m.toString() === senderId.toString());
        if (!isAuthorized) {
          socket.emit('error-message', {
            message: 'You are not authorized to message in this project.',
          });
          return;
        }

        // Save message to database
        const message = await Message.create({
          project: projectId,
          sender: senderId,
          content: content || '',
          fileUrl: fileUrl || '',
          fileName: fileName || '',
          fileType: fileType || '',
          isFile: !!isFile,
        });

        await message.populate('sender', 'name profilePicture');

        // Broadcast to all active users in the project room immediately
        io.to(projectId.toString()).emit('receive-message', message);

        // Notify other project members who might be on another page
        const otherMemberIds = new Set(
          project.members.map((m) => m.toString())
        );
        otherMemberIds.add(project.creator.toString());
        otherMemberIds.delete(senderId.toString());

        for (const recipientId of otherMemberIds) {
          io.to(recipientId).emit('new-notification', {
            type: 'new_message',
            message: `New message from ${message.sender?.name || 'Member'} in "${project.title}"`,
            projectId: project._id,
          });
        }
      } catch (error) {
        console.error('Socket send-message error:', error.message);
      }
    });

    // Typing indicators with user information
    socket.on('typing', ({ projectId, userId, userName }) => {
      if (projectId) {
        socket.to(projectId.toString()).emit('user-typing', {
          userId,
          userName: userName || 'Someone',
        });
      }
    });

    socket.on('stop-typing', ({ projectId, userId, userName }) => {
      if (projectId) {
        socket.to(projectId.toString()).emit('user-stop-typing', {
          userId,
          userName,
        });
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      if (socketProjects.has(socket.id)) {
        const joinedProjects = socketProjects.get(socket.id);
        for (const pId of joinedProjects) {
          if (projectRoomMembers.has(pId)) {
            projectRoomMembers.get(pId).delete(socket.id);
            const roomMembers = projectRoomMembers.get(pId);
            const activeUsers = roomMembers
              ? Array.from(
                  new Map(
                    Array.from(roomMembers.values()).map((u) => [u.userId, u])
                  ).values()
                )
              : [];

            io.to(pId).emit('project-users-online', {
              projectId: pId,
              onlineUsers: activeUsers,
              onlineCount: activeUsers.length,
            });
          }
        }
        socketProjects.delete(socket.id);
      }
    });
  });
};

module.exports = initSocket;
