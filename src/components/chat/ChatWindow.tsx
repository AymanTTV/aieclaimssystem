import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
  startAfter,
  where,
  arrayUnion,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Message, Attachment, Reaction, UserPresence } from '../../types/chat';
import { User } from '../../types';
import { useInView } from 'react-intersection-observer';
import {
  Send,
  Paperclip,
  Smile,
  Edit,
  Trash2,
  Reply,
  X,
  AtSign,
  Users as UsersIcon,
  CheckCheck,
} from 'lucide-react';
import emojiData from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Linkify from 'linkify-react';
import toast from 'react-hot-toast';
import Compressor from 'compressorjs';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes';

// Simple custom debounce function
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
};

interface TypingUser {
  id: string;
  name: string;
}

interface ChatWindowProps {
  onToggleUserList: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onToggleUserList }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);

  // New state for Read By Popover
  const [readByPopover, setReadByPopover] = useState<{
    messageId: string;
    readers: User[];
    position: { x: number; y: number };
  } | null>(null);
  const readByPopoverRef = useRef<HTMLDivElement>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadMoreRef, inView] = useInView();

  const oldestMessageTimestampRef = useRef<Date | null>(null);

  // Close readByPopover if click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (readByPopoverRef.current && !readByPopoverRef.current.contains(event.target as Node)) {
        setReadByPopover(null);
      }
    };

    if (readByPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [readByPopover]);


  // Function to update user presence (online/offline status)
  const updatePresence = useCallback(async (status: 'online' | 'offline' | 'away') => {
    if (!user?.id) return;
    const presenceRef = doc(db, 'presence', user.id);
    try {
      await setDoc(presenceRef, {
        userId: user.id,
        status: status,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user?.id]);

  // Initial presence setup and periodic update
  useEffect(() => {
    if (!user?.id) return;

    updatePresence('online');

    const intervalId = setInterval(() => {
      updatePresence('online');
    }, 30 * 1000);

    const handleBeforeUnload = () => updatePresence('offline');
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence('offline');
    };
  }, [user?.id, updatePresence]);

  // Fetch all users for mentions and user list in UserList component
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as User
      }));
      setUsers(userData);
    });

    const presenceQuery = query(collection(db, 'presence'));
    const unsubscribePresence = onSnapshot(presenceQuery, (snapshot) => {
      const typing: TypingUser[] = [];
      snapshot.docs.forEach(doc => {
        const presenceData = doc.data() as UserPresence;
        if (presenceData.typing && presenceData.typing.roomId === 'general' && presenceData.userId !== user?.id) {
          const typingUser = users.find(u => u.id === presenceData.userId);
          if (typingUser) {
            typing.push({ id: typingUser.id, name: typingUser.name });
          }
        }
      });
      setTypingUsers(typing);
    });

    return () => {
      unsubscribeUsers();
      unsubscribePresence();
    };
  }, [user?.id, users]);

  // Fetch initial messages
  useEffect(() => {
    if (!user) return;

    const initialMessagesQuery = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(initialMessagesQuery, (snapshot) => {
      const initialMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as Message));

      if (snapshot.docs.length > 0) {
        oldestMessageTimestampRef.current = snapshot.docs[snapshot.docs.length - 1].data().timestamp?.toDate() || null;
      } else {
        oldestMessageTimestampRef.current = null;
      }

      setMessages(initialMessages.reverse());
      setAllMessagesLoaded(snapshot.docs.length < 50);
    });

    return () => unsubscribe();
  }, [user]);

  // Scroll to bottom on new messages (only if scrolled near bottom)
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (messagesContainer) {
      const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 200;
      if (isNearBottom || messages.length <= 50) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when chat window is visible and messages are loaded
  useEffect(() => {
    if (user?.id && location.pathname === ROUTES.CHAT && messages.length > 0) {
      const userDocRef = doc(db, 'users', user.id);
      updateDoc(userDocRef, {
        lastReadTimestamp: serverTimestamp()
      }).catch(error => {
        console.error('Error updating lastReadTimestamp:', error);
      });

      messages.forEach(message => {
          if (message.sender.id !== user.id && (!message.readBy || !message.readBy.includes(user.id))) {
              updateDoc(doc(db, 'messages', message.id), {
                  readBy: arrayUnion(user.id)
              }).catch(error => {
                  console.error('Error marking message as read:', error);
              });
          }
      });
    }
  }, [user?.id, location.pathname, messages]);

  // Infinite scrolling logic
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderMessages || allMessagesLoaded || !oldestMessageTimestampRef.current) {
      return;
    }

    setLoadingOlderMessages(true);

    try {
      const olderMessagesQuery = query(
        collection(db, 'messages'),
        orderBy('timestamp', 'desc'),
        startAfter(oldestMessageTimestampRef.current),
        limit(50)
      );

      const snapshot = await getDocs(olderMessagesQuery);
      const olderMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as Message));

      if (olderMessages.length > 0) {
        oldestMessageTimestampRef.current = snapshot.docs[snapshot.docs.length - 1].data().timestamp?.toDate() || null;
        setMessages(prevMessages => [...olderMessages.reverse(), ...prevMessages]);
      } else {
        setAllMessagesLoaded(true);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
      toast.error('Failed to load older messages');
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [loadingOlderMessages, allMessagesLoaded]);

  useEffect(() => {
    if (inView && !allMessagesLoaded) {
      loadOlderMessages();
    }
  }, [inView, allMessagesLoaded, loadOlderMessages]);

  // Typing indicator logic - uses the custom debounce function
  const sendTypingStatus = useCallback(debounce((isTyping: boolean) => {
    if (!user?.id) return;
    const presenceRef = doc(db, 'presence', user.id);
    if (isTyping) {
      updateDoc(presenceRef, {
        typing: { roomId: 'general', timestamp: serverTimestamp() },
        status: 'online',
        lastSeen: serverTimestamp(),
      }, { merge: true });
    } else {
      updateDoc(presenceRef, {
        typing: null,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    }
  }, 500), [user?.id]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    sendTypingStatus(value.length > 0);

    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      if (query.length > 0 && !query.includes(' ') && (value.substring(cursorPosition).startsWith(' ') || value.substring(cursorPosition) === '')) {
         setMentionQuery(query);
         setShowMentions(true);
      } else {
         setShowMentions(false);
         setMentionQuery('');
      }
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleInputBlur = () => {
      setTimeout(() => {
          setShowMentions(false);
          setMentionQuery('');
      }, 100);
      sendTypingStatus(false);
  };

  const handleMentionSelect = (userName: string) => {
      const cursorPosition = inputRef.current?.selectionStart || 0;
      const textBeforeCursor = newMessage.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
          const textAfterMention = newMessage.substring(cursorPosition);
          const newText = newMessage.substring(0, lastAtIndex + 1) + userName + ' ' + textAfterMention;
          setNewMessage(newText);

          const newCursorPosition = lastAtIndex + 1 + userName.length + 1;
          requestAnimationFrame(() => {
              inputRef.current?.setSelectionRange(newCursorPosition, newCursorPosition);
              inputRef.current?.focus();
          });
      }
      setShowMentions(false);
      setMentionQuery('');
  };

  const handleSend = async () => {
    if (!user || (!newMessage.trim() && !replyingTo)) return;

    sendTypingStatus(false);

    try {
      const messageContent = newMessage.trim();
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const detectedMentions = messageContent.match(mentionRegex);
      const mentionedUserIds: string[] = [];

      if (detectedMentions) {
        detectedMentions.forEach(mention => {
            const mentionedName = mention.substring(1);
            const mentionedUser = users.find(u => u.name === mentionedName);
            if (mentionedUser) {
                mentionedUserIds.push(mentionedUser.id);
            }
        });
      }

      const messageData: Partial<Message> = {
        content: messageContent,
        sender: {
          id: user.id,
          name: user.name,
          photoURL: user.photoURL
        },
        timestamp: serverTimestamp() as any,
        edited: false,
        readBy: [user.id],
        roomId: 'general',
      };

      if (replyingTo) {
        messageData.replyTo = replyingTo.id;
      }
      if (mentionedUserIds.length > 0) {
        messageData.mentions = mentionedUserIds;
      }

      await addDoc(collection(db, 'messages'), messageData);

      setNewMessage('');
      setReplyingTo(null);
      setShowMentions(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const attachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');

        let uploadFile = file;
        if (isImage) {
          uploadFile = await new Promise<File>((resolve, reject) => {
            new Compressor(file, {
              quality: 0.8,
              maxWidth: 1920,
              maxHeight: 1080,
              success: (result) => resolve(result as File),
              error: reject
            });
          });
        }

        const timestamp = Date.now();
        const storageRef = ref(storage, `chat/${user.id}/${timestamp}_${file.name}`);

        const uploadTask = uploadBytes(storageRef, uploadFile);

        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            toast.error(`Upload failed for ${file.name}`);
            setUploading(false);
            setUploadProgress(0);
          },
          async () => {
            const url = await getDownloadURL(storageRef);

            attachments.push({
              id: `${timestamp}_${file.name}`,
              type: isImage ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
              url,
              name: file.name,
              size: file.size,
              mimeType: file.type,
              thumbnailUrl: isImage ? url : undefined
            });

            if (attachments.length === files.length) {
               const messageContent = newMessage.trim();
               const mentionRegex = /@([a-zA-Z0-9_]+)/g;
               const detectedMentions = messageContent.match(mentionRegex);
               const mentionedUserIds: string[] = [];

               if (detectedMentions) {
                 detectedMentions.forEach(mention => {
                     const mentionedName = mention.substring(1);
                     const mentionedUser = users.find(u => u.name === mentionedName);
                     if (mentionedUser) {
                         mentionedUserIds.push(mentionedUser.id);
                     }
                 });
               }

               const messageData: Partial<Message> = {
                content: messageContent,
                sender: {
                  id: user.id,
                  name: user.name,
                  photoURL: user.photoURL
                },
                timestamp: serverTimestamp() as any,
                attachments,
                edited: false,
                readBy: [user.id],
                roomId: 'general',
              };

              if (replyingTo) {
                messageData.replyTo = replyingTo.id;
              }
              if (mentionedUserIds.length > 0) {
                messageData.mentions = mentionedUserIds;
              }

              await addDoc(collection(db, 'messages'), messageData);

              setNewMessage('');
              setReplyingTo(null);
              setUploading(false);
              setUploadProgress(0);
              setShowMentions(false);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        content: newContent,
        edited: true
      });
      setEditingMessage(null);
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        deleted: true,
        content: '',
        attachments: [],
        reactions: [],
      });
      setMessages(prevMessages => prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, deleted: true, content: 'This message was deleted.', attachments: [], reactions: [] } : msg
      ));
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleAddReaction = async (message: Message, emoji: string) => {
      if (!user?.id) return;

      const existingReaction = message.reactions?.find(r => r.emoji === emoji);

      if (existingReaction) {
          if (existingReaction.users.includes(user.id)) {
              const updatedUsers = existingReaction.users.filter(userId => userId !== user.id);
              const updatedReactions = message.reactions?.map(r =>
                  r.emoji === emoji ? { ...r, users: updatedUsers } : r
              ).filter(r => r.users.length > 0);

               await updateDoc(doc(db, 'messages', message.id), {
                   reactions: updatedReactions && updatedReactions.length > 0 ? updatedReactions : null
               });

          } else {
              const updatedUsers = [...existingReaction.users, user.id];
              const updatedReactions = message.reactions?.map(r =>
                  r.emoji === emoji ? { ...r, users: updatedUsers } : r
              );
               await updateDoc(doc(db, 'messages', message.id), {
                   reactions: updatedReactions
               });
          }
      } else {
          const newReaction: Reaction = { emoji, users: [user.id] };
          const updatedReactions = message.reactions ? [...message.reactions, newReaction] : [newReaction];
           await updateDoc(doc(db, 'messages', message.id), {
               reactions: updatedReactions
           });
      }
  };

  const findMessageById = (messageId: string | undefined) => {
    if (!messageId) return null;
    return messages.find(m => m.id === messageId);
  };

  const getUserById = (userId: string) => {
      return users.find(u => u.id === userId);
  };

  const filteredUsersForMentions = users.filter(u =>
    u.id !== user?.id && u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Function to show read by popover
  const handleShowReadBy = (event: React.MouseEvent<HTMLSpanElement>, message: Message) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const readers = message.readBy
      ? message.readBy
          .filter(userId => userId !== user?.id) // Exclude current user
          .map(userId => getUserById(userId))
          .filter((u): u is User => u !== undefined) // Filter out undefined users
      : [];

    if (readers.length > 0) {
      setReadByPopover({
        messageId: message.id,
        readers: readers,
        position: { x: rect.left, y: rect.top - 10 }, // Position above the icon
      });
    } else {
      setReadByPopover(null);
    }
  };


  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg relative"> {/* Added relative for popover positioning */}
      {/* Chat Header with user list toggle button for small screens */}
      <div className="p-4 border-b text-lg font-semibold text-gray-800 flex justify-between items-center">
        <span>General Chat</span>
        <button
          onClick={onToggleUserList}
          className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          title="Toggle User List"
        >
          <UsersIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loadingOlderMessages && (
          <div className="text-center text-gray-500">Loading older messages...</div>
        )}
        {!allMessagesLoaded && <div ref={loadMoreRef} className="h-1" />}

        {messages.map((message, index) => {
          const isSentByUser = message.sender.id === user?.id;
          const repliedToMessage = findMessageById(message.replyTo);
          const sender = getUserById(message.sender.id);
          const showAvatar = !isSentByUser;

          if (message.deleted) {
              return (
                  <div
                      key={message.id}
                      className={`flex ${isSentByUser ? 'justify-end' : 'justify-start'}`}
                  >
                      <div className={`max-w-[85%] md:max-w-[70%] bg-gray-200 italic text-gray-600 rounded-lg p-3 text-sm`}>
                          This message was deleted.
                      </div>
                  </div>
              );
          }

          return (
            <div
              key={message.id}
              className={`flex ${isSentByUser ? 'justify-end' : 'justify-start'} items-start space-x-2 group`}
            >
              {showAvatar && (
                  <div className="flex-shrink-0">
                      {sender?.photoURL ? (
                          <img
                              src={sender.photoURL}
                              alt={sender.name}
                              className="h-8 w-8 rounded-full object-cover"
                          />
                      ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
                              {sender?.name?.charAt(0).toUpperCase()}
                          </div>
                      )}
                  </div>
              )}

              <div className={`flex flex-col ${isSentByUser ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                 {!isSentByUser && sender && (
                     <div className="text-sm font-semibold mb-1 text-gray-800">
                         {sender.name}
                     </div>
                 )}
                 <div className={`flex items-center ${isSentByUser ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
                    <div className={`${isSentByUser ? 'bg-primary text-white' : 'bg-gray-100'} rounded-lg p-3 break-words shadow-sm`}>
                        {repliedToMessage && (
                          <div className={`text-sm opacity-75 border-l-2 pl-2 mb-2 ${isSentByUser ? 'border-white text-gray-200' : 'border-gray-400 text-gray-600'}`}>
                            <div className="font-semibold">
                                Replying to {repliedToMessage.sender.name}:
                            </div>
                            <div className="truncate italic">
                                {repliedToMessage.content ? repliedToMessage.content.substring(0, 50) + (repliedToMessage.content.length > 50 ? '...' : '') : '[Attachment]'}
                            </div>
                          </div>
                        )}

                        {editingMessage === message.id ? (
                          <input
                            type="text"
                            value={message.content}
                            onChange={(e) => {
                              setMessages(prevMessages => prevMessages.map(msg =>
                                  msg.id === message.id ? { ...msg, content: e.target.value } : msg
                              ));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEdit(message.id, message.content);
                              } else if (e.key === 'Escape') {
                                setEditingMessage(null);
                                setMessages(prevMessages => prevMessages.map(msg =>
                                    msg.id === message.id ? { ...msg, content: messages.find(m => m.id === message.id)?.content || '' } : msg
                                ));
                              }
                            }}
                            className={`w-full bg-transparent border-none focus:outline-none ${isSentByUser ? 'text-white' : 'text-gray-800'}`}
                            autoFocus
                          />
                        ) : (
                          <Linkify options={{ target: '_blank' }}>
                            {message.content.split(/(\s+)/).map((part, i) => {
                                if (part.startsWith('@')) {
                                    const mentionedName = part.substring(1);
                                    const mentionedUser = message.mentions?.includes(users.find(u => u.name === mentionedName)?.id || '')
                                        ? users.find(u => u.name === mentionedName)
                                        : null;

                                    if (mentionedUser) {
                                        return (
                                            <span key={i} className="font-semibold text-blue-600 cursor-pointer hover:underline">
                                                @{mentionedUser.name}
                                            </span>
                                        );
                                    }
                                }
                                return part;
                            })}
                          </Linkify>
                        )}

                        {message.attachments?.map((attachment) => (
                          <div key={attachment.id} className="mt-2">
                            {attachment.type === 'image' ? (
                              <img
                                src={attachment.url}
                                alt={attachment.name}
                                className="max-w-full rounded-lg cursor-pointer"
                                loading="lazy"
                                onClick={() => window.open(attachment.url, '_blank')}
                              />
                            ) : attachment.type === 'video' ? (
                              <video
                                src={attachment.url}
                                controls
                                className="max-w-full rounded-lg"
                              />
                            ) : (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center space-x-2 text-sm hover:underline ${isSentByUser ? 'text-gray-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                <Paperclip className="h-4 w-4" />
                                <span>{attachment.name}</span>
                              </a>
                            )}
                          </div>
                        ))}

                        {message.reactions && message.reactions.length > 0 && (
                            <div className={`flex items-center space-x-1 mt-2 ${isSentByUser ? 'justify-end' : 'justify-start'}`}>
                                {message.reactions.map(reaction => (
                                    <div
                                        key={reaction.emoji}
                                        className={`flex items-center text-xs px-2 py-0.5 rounded-full cursor-pointer ${
                                            reaction.users.includes(user?.id || '') ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                        onClick={() => handleAddReaction(message, reaction.emoji)}
                                        title={`${reaction.users.map(userId => getUserById(userId)?.name || 'Unknown').join(', ')} reacted with ${reaction.emoji}`}
                                    >
                                        {reaction.emoji} {reaction.users.length}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {editingMessage !== message.id && (
                        <div className={`flex items-center space-x-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${isSentByUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                             <button
                                onClick={() => setReplyingTo(message)}
                                className={`p-1 rounded-full hover:bg-gray-200 ${isSentByUser ? 'text-gray-200 hover:text-white hover:bg-primary-dark' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Reply to message"
                            >
                                <Reply className="h-3 w-3" />
                            </button>

                            {isSentByUser && (
                                <>
                                    <button
                                        onClick={() => setEditingMessage(message.id)}
                                        className={`p-1 rounded-full hover:bg-gray-200 ${isSentByUser ? 'text-gray-200 hover:text-white hover:bg-primary-dark' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="Edit message"
                                    >
                                        <Edit className="h-3 w-3" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(message.id)}
                                        className={`p-1 rounded-full hover:bg-gray-200 ${isSentByUser ? 'text-gray-200 hover:text-white hover:bg-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="Delete message"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-1 rounded-full hover:bg-gray-200 ${isSentByUser ? 'text-gray-200 hover:text-white hover:bg-primary-dark' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Add reaction"
                            >
                                <Smile className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                 </div>

                 <div className={`mt-1 text-xs opacity-75 flex items-center space-x-2 ${isSentByUser ? 'self-end text-gray-500' : 'self-start text-gray-500'}`}>
                     <span>{message.timestamp ? format(message.timestamp, 'HH:mm') : 'Sending...'}</span>

                     {message.edited && <span>(edited)</span>}

                     {/* Clickable Read By Indicator */}
                     {isSentByUser && message.readBy && message.readBy.length > 1 && (
                         <span
                             className="flex items-center space-x-0.5 cursor-pointer hover:opacity-100"
                             onClick={(e) => handleShowReadBy(e, message)}
                             title={`Seen by ${message.readBy.length - 1} other user(s)`}
                         >
                             <CheckCheck className="h-3 w-3 text-blue-500" />
                         </span>
                     )}
                 </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-sm text-gray-600">
              {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
      )}

      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t flex justify-between items-center">
          <div className="flex items-center space-x-2 text-gray-600">
            <Reply className="h-4 w-4" />
            <span className="text-sm">
              Replying to {replyingTo.sender.name}: "{findMessageById(replyingTo.id)?.content ? findMessageById(replyingTo.id)?.content?.substring(0, 50) + ((findMessageById(replyingTo.id)?.content?.length || 0) > 50 ? '...' : '') : '[Attachment]'}..."
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-500 hover:text-gray-700"
            title="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">{Math.round(uploadProgress)}% uploaded</div>
        </div>
      )}

      {showMentions && mentionQuery && (
        <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto z-50 w-48 border border-gray-200">
          {filteredUsersForMentions.length > 0 ? (
            filteredUsersForMentions.map(user => (
              <button
                key={user.id}
                onClick={() => handleMentionSelect(user.name)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-500">{user.name[0]?.toUpperCase()}</span>
                  </div>
                )}
                <span>{user.name}</span>
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">No users found</div>
          )}
        </div>
      )}

      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            disabled={uploading}
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />

           <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Choose emoji"
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              setNewMessage(prev => prev + '@');
              setMentionQuery('');
              setShowMentions(true);
              inputRef.current?.focus();
            }}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Mention a user"
          >
            <AtSign className="h-5 w-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={uploading}
          />

          <button
            onClick={handleSend}
            disabled={(!newMessage.trim() && !replyingTo) || uploading}
            className="p-2 text-primary hover:text-primary-dark disabled:opacity-50"
            title="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 z-50">
            <div className="bg-white rounded-lg shadow-lg">
              <Picker
                data={emojiData}
                onEmojiSelect={(emoji: any) => {
                  if (!replyingTo && editingMessage === null) {
                     const input = inputRef.current;
                     if (input) {
                        const start = input.selectionStart || 0;
                        const end = input.selectionEnd || 0;
                        const newText = newMessage.substring(0, start) + emoji.native + newMessage.substring(end);
                        setNewMessage(newText);
                        const newCursorPosition = start + emoji.native.length;
                         requestAnimationFrame(() => {
                            input.setSelectionRange(newCursorPosition, newCursorPosition);
                            input.focus();
                        });
                     } else {
                         setNewMessage(prev => prev + emoji.native);
                     }
                  } else {
                     toast('Click on a message to add a reaction!');
                  }
                  setShowEmojiPicker(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Read By Popover */}
        {readByPopover && (
          <div
            ref={readByPopoverRef}
            style={{
              position: 'absolute',
              left: readByPopover.position.x,
              top: readByPopover.position.y,
              transform: 'translate(-50%, -100%)', // Center horizontally, move up
            }}
            className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 min-w-[120px]"
          >
            <p className="text-sm font-semibold mb-1">Seen by:</p>
            <ul className="list-disc list-inside text-sm">
              {readByPopover.readers.map((reader) => (
                <li key={reader.id}>{reader.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
