import React from 'react';
import ChatWindow from '../components/chat/ChatWindow';
import UserList from '../components/chat/UserList';

const Chat = () => {
  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4">
      <div className="w-64 flex-shrink-0">
        <UserList />
      </div>
      <div className="flex-1">
        <ChatWindow />
      </div>
    </div>
  );
};

export default Chat;