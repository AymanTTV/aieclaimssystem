import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserPresence } from '../../types/chat';
import { User } from '../../types';

interface UserListProps {
  onUserSelect?: (user: User) => void;
}

const UserList: React.FC<UserListProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [presences, setPresences] = useState<Record<string, UserPresence>>({});

  useEffect(() => {
    // Subscribe to users
    const usersQuery = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const userData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        setUsers(userData);
      }
    );

    // Subscribe to user presence
    const presenceUnsubscribe = onSnapshot(
      collection(db, 'presence'),
      (snapshot) => {
        const presenceData: Record<string, UserPresence> = {};
        snapshot.docs.forEach(doc => {
          presenceData[doc.id] = doc.data() as UserPresence;
        });
        setPresences(presenceData);
      }
    );

    return () => {
      usersQuery();
      presenceUnsubscribe();
    };
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Users</h2>
      <div className="space-y-2">
        {users.map(user => {
          const presence = presences[user.id];
          const isOnline = presence?.status === 'online';
          const isAway = presence?.status === 'away';

          return (
            <div
              key={user.id}
              onClick={() => onUserSelect?.(user)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <div className="relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">
                      {user.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                    isOnline ? 'bg-green-500' : isAway ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}
                />
              </div>

              <div className="flex-1">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-sm text-gray-500">
                  {isOnline ? 'Online' : isAway ? 'Away' : 'Offline'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserList;
