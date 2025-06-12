import React, { useState } from 'react';
import ChatWindow from '../components/chat/ChatWindow';
import UserList from '../components/chat/UserList';
import { X } from 'lucide-react'; // Import X icon

const Chat = () => {
  const [isUserListOpen, setIsUserListOpen] = useState(false); // State to manage user list visibility

  const toggleUserList = () => {
    setIsUserListOpen(!isUserListOpen);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row relative"> {/* Added relative for absolute positioning of mobile user list */}
      {/* UserList for large screens */}
      <div className="hidden lg:block lg:w-64 p-4 border-r bg-white shadow-lg rounded-lg m-2 flex-shrink-0">
        <UserList />
      </div>

      {/* ChatWindow takes up the main space */}
      <div className="flex-1 p-2 flex flex-col"> {/* Added flex flex-col to ChatWindow container */}
        <ChatWindow onToggleUserList={toggleUserList} /> {/* Pass toggle function to ChatWindow */}
      </div>

      {/* UserList as an overlay for small screens */}
      {isUserListOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-gray-600 bg-opacity-75" onClick={toggleUserList} />

          {/* User List Panel */}
          <div className="absolute inset-y-0 right-0 w-full max-w-xs bg-white shadow-xl p-4">
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleUserList}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <UserList />
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
