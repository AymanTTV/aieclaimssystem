import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Message, Attachment } from '../../types/chat';
import { useInView } from 'react-intersection-observer';
import { Send, Paperclip, Smile, Edit, Trash2, Reply, X, AtSign } from 'lucide-react';
import emojiData from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import Linkify from 'linkify-react';
import toast from 'react-hot-toast';
import Compressor from 'compressorjs';
import { format } from 'date-fns';

const ChatWindow: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ref, inView] = useInView();

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date() // Convert Firestore timestamp to Date
      } as Message));
      setMessages(newMessages.reverse());
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!user || (!newMessage.trim() && !replyingTo)) return;

    try {
      const messageData: any = {
        content: newMessage.trim(),
        sender: {
          id: user.id,
          name: user.name,
          photoURL: user.photoURL
        },
        timestamp: new Date(),
        edited: false
      };

      if (replyingTo) {
        messageData.replyTo = replyingTo.id;
      }

      const mentionRegex = /@(\w+)/g;
      const mentions = newMessage.match(mentionRegex);
      if (mentions) {
        messageData.mentions = mentions.map(mention => mention.substring(1));
      }

      await addDoc(collection(db, 'messages'), messageData);

      setNewMessage('');
      setReplyingTo(null);
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
          uploadFile = await new Promise((resolve, reject) => {
            new Compressor(file, {
              quality: 0.8,
              maxWidth: 1920,
              maxHeight: 1080,
              success: resolve,
              error: reject
            });
          });
        }

        const timestamp = Date.now();
        const storageRef = ref(storage, `chat/${user.id}/${timestamp}_${file.name}`);
        
        await uploadBytes(storageRef, uploadFile);
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

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      const messageData: any = {
        content: newMessage.trim(),
        sender: {
          id: user.id,
          name: user.name,
          photoURL: user.photoURL
        },
        timestamp: new Date(),
        attachments,
        edited: false
      };

      if (replyingTo) {
        messageData.replyTo = replyingTo.id;
      }

      await addDoc(collection(db, 'messages'), messageData);

      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
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
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1));
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    const words = newMessage.split(' ');
    words[words.length - 1] = `@${username}`;
    setNewMessage(words.join(' ') + ' ');
    setShowMentions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            ref={index === messages.length - 1 ? messagesEndRef : undefined}
            className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] ${message.sender.id === user?.id ? 'bg-primary text-white' : 'bg-gray-100'} rounded-lg p-3 break-words`}>
              {message.replyTo && (
                <div className="text-sm opacity-75 border-l-2 pl-2 mb-2">
                  {messages.find(m => m.id === message.replyTo)?.content || 'Message not found'}
                </div>
              )}
              
              {editingMessage === message.id ? (
                <input
                  type="text"
                  value={message.content}
                  onChange={(e) => {
                    const newMessages = [...messages];
                    const index = newMessages.findIndex(m => m.id === message.id);
                    newMessages[index] = { ...message, content: e.target.value };
                    setMessages(newMessages);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEdit(message.id, message.content);
                    }
                  }}
                  className="w-full bg-transparent border-none focus:outline-none"
                  autoFocus
                />
              ) : (
                <Linkify options={{ target: '_blank' }}>
                  {message.content}
                </Linkify>
              )}

              {message.attachments?.map((attachment) => (
                <div key={attachment.id} className="mt-2">
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-full rounded-lg"
                      loading="lazy"
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
                      className="flex items-center space-x-2 text-sm hover:underline"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span>{attachment.name}</span>
                    </a>
                  )}
                </div>
              ))}

              <div className="mt-1 text-xs opacity-75 flex items-center space-x-2">
                <span>{format(message.timestamp, 'HH:mm')}</span>
                {message.edited && <span>(edited)</span>}
                
                {message.sender.id === user?.id && (
                  <>
                    <button
                      onClick={() => setEditingMessage(message.id)}
                      className="hover:text-gray-300"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(message.id)}
                      className="hover:text-gray-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setReplyingTo(message)}
                  className="hover:text-gray-300"
                >
                  <Reply className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <div ref={ref} />
      </div>

      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Reply className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Replying to {replyingTo.sender.name}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-500 hover:text-gray-700"
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
        </div>
      )}

      {showMentions && (
        <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
          {users
            .filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
            .map(user => (
              <button
                key={user.id}
                onClick={() => handleMentionSelect(user.name)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-2"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs">{user.name[0]}</span>
                  </div>
                )}
                <span>{user.name}</span>
              </button>
            ))}
        </div>
      )}

      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700"
            disabled={uploading}
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
          >
            <Smile className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              setNewMessage(prev => prev + '@');
              setShowMentions(true);
              inputRef.current?.focus();
            }}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <AtSign className="h-5 w-5" />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() && !replyingTo}
            className="p-2 text-primary hover:text-primary-dark disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50">
            <div className="bg-white rounded-lg shadow-lg">
              <Picker
                data={emojiData}
                onEmojiSelect={(emoji: any) => {
                  setNewMessage(prev => prev + emoji.native);
                  setShowEmojiPicker(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;