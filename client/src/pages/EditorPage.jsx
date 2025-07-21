import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { FiFilePlus, FiFolderPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { updateRoomTimestamp } from '../services/roomService';
import ExecuteService from '../services/executeService';
import OutputPanel from '../components/OutputPanel';
import '../styles/VSCodeExplorer.css';
import { toast } from 'react-toastify';
import { useHotkeys } from 'react-hotkeys-hook';
import ShareRoomModal from '../components/Room/ShareRoomModal';
import socket from '../socket';
import ChatBox from '../components/Chat/ChatBox';

export default function EditorPage() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fileTree, setFileTree] = useState({
    name: 'root',
    type: 'folder',
    children: [],
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);
  const [output, setOutput] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionDetails, setExecutionDetails] = useState(null);
  const [isOutputVisible, setIsOutputVisible] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [users, setUsers] = useState([]); // For real-time user list
  const [ownerSocketId, setOwnerSocketId] = useState(null); // Track owner socket id
  const userNameRef = useRef(user?.name || user?.email || user?.ownerId || 'User');

  const handleCopyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      // You could add a toast notification here
    }
  };

  const handleClearOutput = () => {
    setOutput('');
    setExecutionDetails(null);
    setIsOutputVisible(false);
  };

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
  console.log('🔗 EditorPage API_BASE_URL:', API_BASE_URL);

  // Function to save current file tree state
  const saveFileTreeState = async () => {
    if (!user || !user.ownerId || !roomId) {
      console.log('❌ Cannot save file tree state - missing user or room info');
      return;
    }

    try {
      console.log('💾 Saving file tree state:', fileTree);
      console.log('📄 Files in tree:', fileTree.children?.map((f) => f.name) || []);

      const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId: user.ownerId,
          files: fileTree,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to save file tree state:', error.error);
        return;
      }

      console.log('✅ File tree state saved successfully');
    } catch (err) {
      console.error('❌ Error saving file tree state:', err);
    }
  };

  // Debounced timestamp update function
  const debouncedUpdateTimestamp = useCallback(
    (() => {
      let timeoutId;
      return () => {
        console.log('🔄 Debounced timestamp update triggered');
        console.log('👤 User object:', user);
        console.log('🆔 Room ID:', roomId);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (!user || !user.ownerId || !roomId) {
            console.log('❌ Missing user, ownerId, or roomId for timestamp update');
            console.log('   user:', !!user);
            console.log('   user.ownerId:', user?.ownerId);
            console.log('   roomId:', roomId);
            return;
          }

          const now = Date.now();
          // Only update if it's been more than 2 seconds since last update
          if (now - lastUpdateTime > 2000) {
            try {
              console.log(`🕐 Updating timestamp for room ${roomId} with ownerId ${user.ownerId}`);
              await updateRoomTimestamp(roomId, user.ownerId);
              setLastUpdateTime(now);
              console.log('✅ Room timestamp updated successfully');

              // Also save the current file tree state
              await saveFileTreeState();
            } catch (error) {
              console.error('❌ Failed to update timestamp:', error);
            }
          } else {
            console.log('⏱️ Skipping timestamp update (too soon)');
          }
        }, 1000); // Wait 1 second after last change
      };
    })(),
    [user, roomId, lastUpdateTime]
  );

  // ✅ Verify room ownership and load files when component mounts
  useEffect(() => {
    const verifyRoomAccess = async () => {
      if (!user || !user.ownerId) {
        toast.error('❌ You must be logged in to access this room.');
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/room/${roomId}/info?ownerId=${user.ownerId}`
        );

        if (!response.ok) {
          const error = await response.json();
          toast.error(`❌ Room access error: ${error.error}`);
          navigate('/dashboard');
          return;
        }

        const data = await response.json();
        setRoomInfo(data.room);
        setIsOwner(data.isOwner);

        console.log('✅ Room access verified:', {
          isOwner: data.isOwner,
          canShutdown: data.canShutdown,
        });

        // ✅ Load existing files if room is shut down
        if (!data.room.isActive && data.room.s3Key) {
          await loadRoomFiles();
        }
      } catch (err) {
        console.error('❌ Error verifying room access:', err);
        toast.error('❌ Error accessing room.');
        navigate('/dashboard');
      }
    };

    verifyRoomAccess();
  }, [roomId, user, navigate, API_BASE_URL]);

  // ✅ Load room files from S3
  const loadRoomFiles = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/room/${roomId}/files?ownerId=${user.ownerId}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Failed to load room files:', error.error);
        return;
      }

      const data = await response.json();
      console.log('✅ Room files loaded:', data.files);

      // Set the file tree with loaded files
      console.log('📁 Setting file tree:', data.files);
      setFileTree(data.files);

      // Open the first file if available
      if (data.files.children && data.files.children.length > 0) {
        const firstFile = data.files.children.find((child) => child.type === 'file');
        if (firstFile) {
          console.log('📄 Opening first file:', firstFile);
          setSelectedFile(firstFile);
          setOpenTabs([firstFile]);
        }
      }
    } catch (err) {
      console.error('❌ Error loading room files:', err);
    }
  };

  const languageColors = {
    js: '#f0db4f',
    py: '#3572A5',
    java: '#b07219',
    cpp: '#f34b7d',
    html: '#e34c26',
    css: '#563d7c',
    json: '#cbcb41',
    md: '#083fa1',
    txt: '#999',
  };

  const getColorForFile = (name) => {
    const ext = name.split('.').pop();
    return languageColors[ext] || '#ccc';
  };

  // Emit file-tree-change to other users
  const emitFileTreeChange = (newTree) => {
    socket.emit('file-tree-change', {
      roomId,
      fileTree: newTree,
      senderId: socket.id,
    });
  };

  // Emit file-tree-and-tabs-change to other users
  const emitFileTreeAndTabsChange = (newTree, newOpenTabs, newSelectedFile) => {
    console.log('[SOCKET] Emitting file-tree-and-tabs-change:', {
      roomId,
      fileTree: newTree,
      openTabs: newOpenTabs,
      selectedFile: newSelectedFile,
      senderId: socket.id,
    });
    socket.emit('file-tree-and-tabs-change', {
      roomId,
      fileTree: newTree,
      openTabs: newOpenTabs,
      selectedFile: newSelectedFile,
      senderId: socket.id,
    });
  };

  // Listen for file-tree-change and update the file tree
  useEffect(() => {
    if (!roomId) return;
    const handleFileTreeChange = (payload) => {
      console.log('[SOCKET] Received file-tree-change:', payload);
      if (payload && payload.roomId === roomId && payload.senderId !== socket.id) {
        setFileTree(payload.fileTree);
        // After updating the file tree, check if the selected file still exists
        if (selectedFile) {
          // Recursively search for the file in the new tree
          const findFile = (node, name) => {
            if (node.type === 'file' && node.name === name) return node;
            if (node.type === 'folder' && node.children) {
              for (const child of node.children) {
                const found = findFile(child, name);
                if (found) return found;
              }
            }
            return null;
          };
          const foundFile = findFile(payload.fileTree, selectedFile.name);
          if (foundFile) {
            setSelectedFile(foundFile);
          } else {
            setSelectedFile(null);
          }
        }
      }
    };
    socket.on('file-tree-change', handleFileTreeChange);
    return () => {
      socket.off('file-tree-change', handleFileTreeChange);
    };
  }, [roomId, selectedFile]);

  // Listen for file-tree-and-tabs-change and update file tree, open tabs, and selected file
  useEffect(() => {
    if (!roomId) return;
    const handleFileTreeAndTabsChange = (payload) => {
      console.log('[SOCKET] Received file-tree-and-tabs-change:', payload);
      if (payload && payload.roomId === roomId && payload.senderId !== socket.id) {
        setFileTree(payload.fileTree);
        setOpenTabs(payload.openTabs || []);
        setSelectedFile(payload.selectedFile || null);
      }
    };
    socket.on('file-tree-and-tabs-change', handleFileTreeAndTabsChange);
    return () => {
      socket.off('file-tree-and-tabs-change', handleFileTreeAndTabsChange);
    };
  }, [roomId]);

  // Update file creation, folder creation, rename, and delete to emit file-tree-and-tabs-change
  const handleAddFile = () => {
    const fileName = prompt('Enter file name (e.g., index.js)');
    if (!fileName) return;

    const ext = fileName.split('.').pop();
    const languageMap = {
      js: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      txt: 'plaintext',
    };
    const language = languageMap[ext] || 'plaintext';

    const newFile = {
      name: fileName,
      type: 'file',
      language,
      content: '',
    };

    setFileTree((prev) => {
      const newTree = {
        ...prev,
        children: [...prev.children, newFile],
      };
      const newTabs = [...openTabs, newFile];
      console.log('[DEBUG] handleAddFile newTree:', newTree);
      emitFileTreeAndTabsChange(newTree, newTabs, newFile);
      return newTree;
    });
    setSelectedFile(newFile);
    setOpenTabs((prev) => [...prev, newFile]);
    debouncedUpdateTimestamp();
    setTimeout(() => saveFileTreeState(), 100);
  };

  const handleAddFolder = () => {
    const folderName = prompt('Enter folder name');
    if (!folderName) return;

    const newFolder = {
      name: folderName,
      type: 'folder',
      children: [],
    };

    setFileTree((prev) => {
      const newTree = {
        ...prev,
        children: [...prev.children, newFolder],
      };
      console.log('[DEBUG] handleAddFolder newTree:', newTree);
      emitFileTreeAndTabsChange(newTree, openTabs, selectedFile);
      return newTree;
    });
    debouncedUpdateTimestamp();
    setTimeout(() => saveFileTreeState(), 100);
  };

  // Update rename and delete logic to emit file-tree-change
  const handleRename = (node) => {
    const newName = prompt('Enter new name', node.name);
    if (!newName) return;

    const renameNode = (n) => {
      if (n === node) return { ...n, name: newName };
      if (n.type === 'folder') {
        return { ...n, children: n.children.map(renameNode) };
      }
      return n;
    };

    setFileTree((prev) => {
      const newTree = renameNode(prev);
      // Update openTabs and selectedFile references
      const newTabs = openTabs.map((tab) => (tab === node ? { ...tab, name: newName } : tab));
      const newSelected = selectedFile === node ? { ...node, name: newName } : selectedFile;
      console.log('[DEBUG] handleRename newTree:', newTree);
      emitFileTreeAndTabsChange(newTree, newTabs, newSelected);
      return newTree;
    });
    if (selectedFile === node) setSelectedFile({ ...node, name: newName });
    setOpenTabs((prev) => prev.map((tab) => (tab === node ? { ...tab, name: newName } : tab)));
    debouncedUpdateTimestamp();
  };

  const handleDelete = (node) => {
    const deleteNode = (n) => {
      if (n.type === 'folder') {
        return { ...n, children: n.children.filter((child) => child !== node).map(deleteNode) };
      }
      return n;
    };

    setFileTree((prev) => {
      const newTree = {
        ...prev,
        children: prev.children.filter((child) => child !== node).map(deleteNode),
      };
      // Remove from openTabs and selectedFile if deleted
      const newTabs = openTabs.filter((tab) => tab !== node);
      const newSelected = selectedFile === node ? null : selectedFile;
      console.log('[DEBUG] handleDelete newTree:', newTree);
      emitFileTreeAndTabsChange(newTree, newTabs, newSelected);
      return newTree;
    });
    setOpenTabs((prev) => prev.filter((tab) => tab !== node));
    if (selectedFile === node) setSelectedFile(null);
    debouncedUpdateTimestamp();
  };

  const handleFileClick = (node) => {
    if (node.type !== 'file') return;
    setSelectedFile(node);
    // Check if the file is already in openTabs by comparing the actual file object
    if (!openTabs.find((tab) => tab === node)) {
      setOpenTabs((prev) => [...prev, node]);
    }
  };

  const handleCloseTab = (tabToClose) => {
    const remainingTabs = openTabs.filter((tab) => tab !== tabToClose);
    setOpenTabs(remainingTabs);
    if (selectedFile === tabToClose) {
      setSelectedFile(remainingTabs.length > 0 ? remainingTabs[0] : null);
    }
  };

  const renderTree = (node, depth = 0) => {
    if (depth === 0) {
      console.log('[DEBUG] renderTree fileTree:', fileTree);
    }
    const isSelected = selectedFile === node;
    const isExpanded = expandedFolders.has(node.name);

    const handleRename = () => {
      const newName = prompt('Enter new name', node.name);
      if (!newName) return;

      const renameNode = (n) => {
        if (n === node) return { ...n, name: newName };
        if (n.type === 'folder') {
          return { ...n, children: n.children.map(renameNode) };
        }
        return n;
      };

      setFileTree(renameNode(fileTree));
      if (isSelected) setSelectedFile({ ...node, name: newName });

      // Update openTabs to reflect the new filename
      setOpenTabs((prev) => prev.map((tab) => (tab === node ? { ...tab, name: newName } : tab)));

      // Update timestamp when file/folder is renamed
      debouncedUpdateTimestamp();

      // Immediately save the file tree state to ensure changes are persisted
      setTimeout(() => saveFileTreeState(), 100);
    };

    const handleDelete = () => {
      const deleteNode = (current, target) => {
        if (!current.children) return current;
        return {
          ...current,
          children: current.children
            .filter((child) => child !== target)
            .map((child) => deleteNode(child, target)),
        };
      };

      setFileTree(deleteNode(fileTree, node));
      if (isSelected) setSelectedFile(null);
      setOpenTabs((prev) => prev.filter((tab) => tab !== node));
      debouncedUpdateTimestamp();
      setTimeout(() => saveFileTreeState(), 100);
    };

    const getFileIcon = (name, type) => {
      if (type === 'folder') {
        return isExpanded ? '📂' : '📁';
      }

      const ext = name.split('.').pop().toLowerCase();

      // Language logos using Unicode symbols that look like actual logos
      const iconMap = {
        // JavaScript/TypeScript
        js: '⚡',
        jsx: '⚡',
        ts: '🔷',
        tsx: '🔷',

        // Python
        py: '🐍',

        // Java
        java: '☕',

        // C/C++
        cpp: '⚙️',
        c: '⚙️',
        h: '⚙️',
        hpp: '⚙️',

        // Web
        html: '🌐',
        htm: '🌐',
        css: '🎨',
        scss: '🎨',
        sass: '🎨',

        // Data
        json: '📋',
        xml: '📄',
        yml: '⚙️',
        yaml: '⚙️',

        // Documentation
        md: '📝',
        txt: '📄',
        rst: '📖',

        // Images
        png: '🖼️',
        jpg: '🖼️',
        jpeg: '🖼️',
        gif: '🖼️',
        svg: '🖼️',

        // Archives
        zip: '📦',
        rar: '📦',
        tar: '📦',
        gz: '📦',

        // Config
        env: '🔧',
        gitignore: '🚫',
        dockerfile: '🐳',

        // Additional languages
        php: '🐘',
        rb: '💎',
        go: '🐹',
        rs: '🦀',
        kt: '🔶',
        swift: '🍎',
        sql: '🗄️',
        sh: '🐚',
        ps1: '🔵',
        bat: '🖥️',
      };

      return iconMap[ext] || '📄';
    };

    const fileColor = getColorForFile(node.name);

    return (
      <div key={node.name}>
        <div
          className={`vscode-tree-item ${isSelected ? 'selected' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '2px 8px',
            marginLeft: `${depth * 12}px`,
            backgroundColor: isSelected ? '#094771' : 'transparent',
            color: isSelected ? '#ffffff' : '#cccccc',
            cursor: 'pointer',
            fontSize: '13px',
            height: '22px',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.target.style.backgroundColor = '#2a2d2e';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.target.style.backgroundColor = 'transparent';
            }
          }}
          onClick={() => handleFileClick(node)}
        >
          {/* Expand/Collapse Arrow for folders */}
          {node.type === 'folder' && (
            <span
              style={{
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#cccccc',
                marginRight: '4px',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
              onClick={(e) => {
                e.stopPropagation();
                const newExpanded = new Set(expandedFolders);
                if (isExpanded) {
                  newExpanded.delete(node.name);
                } else {
                  newExpanded.add(node.name);
                }
                setExpandedFolders(newExpanded);
              }}
            >
              ▶
            </span>
          )}

          {/* File/Folder Icon */}
          <span
            className="file-icon"
            data-type={node.type === 'folder' ? 'folder' : node.name.split('.').pop().toLowerCase()}
            style={{
              marginRight: '6px',
              fontSize: '14px',
              color: node.type === 'folder' ? '#cccccc' : fileColor,
            }}
          >
            {getFileIcon(node.name, node.type)}
          </span>

          {/* File/Folder Name */}
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: fileColor,
            }}
          >
            {node.name}
          </span>

          {/* Action Buttons (only show on hover) */}
          <div
            className="vscode-tree-actions"
            style={{
              display: 'flex',
              gap: '2px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              position: 'absolute',
              right: '8px',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = 1)}
            onMouseLeave={(e) => (e.target.style.opacity = 0)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}
              className="vscode-action-btn"
              title="Rename"
              style={{
                background: 'none',
                border: 'none',
                color: '#cccccc',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '2px',
                fontSize: '10px',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#3c3c3c')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(node);
              }}
              className="vscode-action-btn"
              title="Delete"
              style={{
                background: 'none',
                border: 'none',
                color: '#cccccc',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '2px',
                fontSize: '10px',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#3c3c3c')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Render children if folder is expanded */}
        {node.type === 'folder' && isExpanded && node.children && (
          <div
            style={{
              overflow: 'hidden',
              transition: 'all 0.2s ease',
            }}
          >
            {node.children.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleRun = async () => {
    if (!selectedFile || selectedFile.type !== 'file') {
      toast.error('Please select a file to run.');
      return;
    }

    // Check if language is supported for execution
    const language = ExecuteService.getLanguageFromFilename(selectedFile.name);
    if (!ExecuteService.isLanguageSupported(language)) {
      setOutput(
        `❌ Language '${language}' is not supported for execution.\nSupported languages: JavaScript, Python, Java, C++, Rust`
      );
      setExecutionDetails({
        fileName: selectedFile.name,
        language: language,
        error: 'Language not supported',
        timestamp: new Date().toLocaleString(),
      });
      setIsOutputVisible(true);
      return;
    }

    try {
      setIsExecuting(true);
      setIsOutputVisible(true);
      setOutput('🚀 Executing code...\n');

      console.log(`🎯 Running file: ${selectedFile.name} (${language})`);

      const result = await ExecuteService.executeCode(
        selectedFile.content,
        language,
        selectedFile.name,
        user?.ownerId
      );

      if (result.success) {
        // Only show the actual code output on the left panel
        let outputText = '';

        if (result.output) {
          outputText += result.output;
        }

        if (result.error) {
          outputText += `\n⚠️ Warnings:\n${result.error}`;
        }

        setOutput(outputText);
        setExecutionDetails({
          fileName: selectedFile.name,
          language: language,
          executionTime: result.executionTime || 'N/A',
          memoryUsed: result.memoryUsed || 'N/A',
          warnings: result.error || null,
          timestamp: new Date().toLocaleString(),
        });
      } else {
        // Only show error and partial output on the left panel
        let errorText = `❌ Execution failed!\n\n🚨 Error:\n${result.error}\n`;

        if (result.output) {
          errorText += `\n📤 Partial output:\n${result.output}`;
        }

        setOutput(errorText);
        setExecutionDetails({
          fileName: selectedFile.name,
          language: language,
          error: result.error,
          output: result.output || null,
          timestamp: new Date().toLocaleString(),
        });
      }
    } catch (error) {
      console.error('❌ Execution error:', error);
      setOutput(
        `❌ Execution failed!\n\n🚨 Error: ${error.message}\n\nPlease check your code and try again.`
      );
      setExecutionDetails({
        fileName: selectedFile.name,
        language: language,
        error: error.message,
        timestamp: new Date().toLocaleString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // ✅ FIXED: Handles room shutdown with ownerId verification
  const handleShutRoom = async () => {
    if (!user || !user.ownerId) {
      toast.error('❌ You must be logged in to shut down a room.');
      return;
    }

    // Notify and kick all users before shutting down
    shuttingDownRef.current = true;
    socket.emit('shutdown-room', { roomId });
    // Wait for user-list to update (all others gone), then proceed
    await new Promise((resolve) => {
      proceedShutdownRef.current = resolve;
    });
    shuttingDownRef.current = false;

    try {
      // First, ensure the current file tree state is saved to S3
      console.log('💾 Ensuring file tree state is saved before shutdown...');
      await saveFileTreeState();

      const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/shutdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId: user.ownerId,
          files: fileTree,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Shutdown error:', error);
        toast.error(`❌ Failed to shut room: ${error.error}`);
        return;
      }

      const result = await response.json();
      console.log('✅ Room shut:', result);
      toast.success('✅ Room shut successfully. Metadata stored.');

      // Force refresh the dashboard to show updated shutdown time
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('❌ Failed to shut room:', err);
      toast.error('❌ Error occurred while shutting the room.');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('🔗 Room link copied!');
  };

  const updateContent = (val) => {
    console.log('📝 Content update triggered');

    const updated = { ...selectedFile, content: val };
    setSelectedFile(updated);

    const recursiveUpdate = (node) => {
      if (node === selectedFile) return updated;
      if (node.type === 'folder') {
        return {
          ...node,
          children: node.children.map(recursiveUpdate),
        };
      }
      return node;
    };

    setFileTree(recursiveUpdate(fileTree));

    // Update timestamp when content changes
    console.log('🔄 Calling debounced timestamp update');
    debouncedUpdateTimestamp();
  };

  useHotkeys(
    'ctrl+enter',
    (e) => {
      e.preventDefault();
      handleRun();
    },
    [selectedFile, isExecuting]
  );

  useHotkeys(
    'ctrl+s',
    (e) => {
      e.preventDefault();
      saveFileTreeState();
      toast.success('💾 File tree saved!');
    },
    [fileTree, selectedFile]
  );

  useHotkeys(
    'esc',
    (e) => {
      if (isOutputVisible) {
        e.preventDefault();
        setIsOutputVisible(false);
      }
    },
    [isOutputVisible]
  );

  // Real-time presence: join room and listen for user list/notifications
  useEffect(() => {
    if (!roomId || !user) return;
    // Join the room with username
    socket.emit('join-room', { roomId, username: userNameRef.current });

    // Listen for user list updates
    socket.on('user-list', (payload) => {
      if (Array.isArray(payload)) {
        setUsers(payload);
        setOwnerSocketId(null);
      } else if (payload && Array.isArray(payload.users)) {
        setUsers(payload.users);
        setOwnerSocketId(payload.ownerSocketId || null);
      }
    });
    // Listen for join/leave notifications
    socket.on('user-joined', ({ id, username }) => {
      if (id !== socket.id) {
        toast.info(`${username || 'A user'} joined the room!`);
      }
    });
    socket.on('user-left', (id) => {
      toast.info(`A user left the room.`);
    });
    // Listen for room-closed event (kick)
    socket.on('room-closed', ({ message }) => {
      if (!isOwner) {
        toast.error(message || 'Room closed for development');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    });
    // Listen for disconnect (force kick)
    const handleDisconnect = () => {
      if (!isOwner) {
        toast.error('Room closed for development');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    };
    socket.on('disconnect', handleDisconnect);
    // Listen for force-redirect event
    const handleForceRedirect = ({ url, message }) => {
      toast.error(message || 'Room closed for development');
      setTimeout(() => {
        window.location.href = url || '/dashboard';
      }, 1000);
    };
    socket.on('force-redirect', handleForceRedirect);
    // Clean up listeners on unmount
    return () => {
      socket.emit('leave-room', { roomId });
      socket.off('user-list');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('room-closed');
      socket.off('disconnect', handleDisconnect);
      socket.off('force-redirect', handleForceRedirect);
    };
  }, [roomId, user, isOwner, navigate]);

  // Track if shutdown is in progress and provide a callback to proceed
  const shuttingDownRef = useRef(false);
  const proceedShutdownRef = useRef(() => {});

  // Real-time code sync
  useEffect(() => {
    if (!roomId || !selectedFile) return;
    // Listen for code updates from other users
    const handleCodeUpdate = (payload) => {
      if (payload && payload.fileName === selectedFile.name && payload.senderId !== socket.id) {
        setFileTree((prevTree) => {
          // Recursively update the content of the correct file
          const updateContent = (node) => {
            if (node.type === 'file' && node.name === payload.fileName) {
              return { ...node, content: payload.code };
            } else if (node.type === 'folder' && node.children) {
              return { ...node, children: node.children.map(updateContent) };
            }
            return node;
          };
          return updateContent(prevTree);
        });
        // If the selected file is open, update its content
        if (selectedFile) {
          setSelectedFile((prev) => ({ ...prev, content: payload.code }));
        }
      }
    };
    socket.on('code-update', handleCodeUpdate);
    return () => {
      socket.off('code-update', handleCodeUpdate);
    };
  }, [roomId, selectedFile]);

  // Handler for editor changes (multi-file sync)
  const handleEditorChange = (value) => {
    if (!selectedFile) return;
    setSelectedFile((prev) => ({ ...prev, content: value }));
    setFileTree((prevTree) => {
      // Recursively update the content of the correct file
      const updateContent = (node) => {
        if (node.type === 'file' && node.name === selectedFile.name) {
          // Emit code-change for this file
          const payload = {
            roomId,
            fileName: selectedFile.name,
            code: value,
            senderId: socket.id,
          };
          console.log('[SOCKET] Emitting code-change:', payload);
          socket.emit('code-change', payload);
          return { ...node, content: value };
        } else if (node.type === 'folder' && node.children) {
          return { ...node, children: node.children.map(updateContent) };
        }
        return node;
      };
      return updateContent(prevTree);
    });
    // Update timestamp when content changes
    debouncedUpdateTimestamp();
  };

  // Listen for code-update and update the correct file in the tree (multi-file sync)
  useEffect(() => {
    if (!roomId) return;
    const handleCodeUpdate = (payload) => {
      console.log('[SOCKET] Received code-update:', payload);
      if (payload && payload.roomId === roomId && payload.senderId !== socket.id) {
        setFileTree((prevTree) => {
          // Recursively update the content of the correct file
          const updateContent = (node) => {
            if (node.type === 'file' && node.name === payload.fileName) {
              return { ...node, content: payload.code };
            } else if (node.type === 'folder' && node.children) {
              return { ...node, children: node.children.map(updateContent) };
            }
            return node;
          };
          return updateContent(prevTree);
        });
        // If the updated file is currently open, update its content
        if (selectedFile && selectedFile.name === payload.fileName) {
          setSelectedFile((prev) => ({ ...prev, content: payload.code }));
        }
      }
    };
    socket.on('code-update', handleCodeUpdate);
    return () => {
      socket.off('code-update', handleCodeUpdate);
    };
  }, [roomId, selectedFile]);

  // Polling fallback: if owner is gone, non-owners redirect
  useEffect(() => {
    if (!isOwner) {
      const interval = setInterval(() => {
        // If user list is empty or no user has isOwner: true, redirect
        if (users.length === 0 || !users.some((u) => u.isOwner)) {
          toast.error('Room owner left. Room closed for development.');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1000);
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [users, isOwner]);

  return (
    <div
      style={{
        backgroundColor: '#121212',
        color: '#fff',
        minHeight: '100vh',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#1f1f1f',
          borderBottom: '1px solid #333',
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>🧠 CodeWeave</div>
        {/* User list display */}
        <div
          style={{
            color: '#a4508b',
            fontWeight: 600,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>👥 {users.length} online:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {users.map((u, idx) => {
              // Color palette for user pills
              const colors = [
                '#a4508b',
                '#5f0a87',
                '#00bcd4',
                '#ff9800',
                '#4caf50',
                '#e91e63',
                '#9c27b0',
                '#2196f3',
                '#ff5722',
                '#607d8b',
                '#ffc107',
                '#009688',
              ];
              const color = colors[idx % colors.length];
              return (
                <span
                  key={u.id || u.username || idx}
                  style={{
                    background: color,
                    color: '#fff',
                    borderRadius: 16,
                    padding: '2px 12px',
                    fontWeight: 700,
                    fontSize: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    display: 'inline-block',
                    width: 90,
                    maxWidth: 90,
                    minWidth: 90,
                    textAlign: 'center',
                    letterSpacing: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.username || u.id}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleRun}
            style={{
              ...buttonStyle,
              opacity: isExecuting ? 0.7 : 1,
              cursor: isExecuting ? 'not-allowed' : 'pointer',
            }}
            disabled={isExecuting}
          >
            {isExecuting ? '⏳ Running...' : '▶ Run'}
          </button>
          {isOwner && (
            <button onClick={() => setShowShareModal(true)} style={buttonStyle}>
              🔗 Share
            </button>
          )}
          {isOwner && (
            <button
              onClick={async () => {
                // Disable button immediately
                if (window.__shuttingDown) return;
                window.__shuttingDown = true;
                toast.info('Shutting down room...');
                // Emit shutdown-room to kick others
                socket.emit('shutdown-room', { roomId });
                // Wait a moment for others to be kicked
                await new Promise((res) => setTimeout(res, 1000));
                try {
                  // Save file tree
                  await saveFileTreeState();
                  const response = await fetch(`${API_BASE_URL}/api/room/${roomId}/shutdown`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ownerId: user.ownerId, files: fileTree }),
                  });
                  if (!response.ok) {
                    const error = await response.json();
                    toast.error(`❌ Failed to shut room: ${error.error}`);
                    window.__shuttingDown = false;
                    return;
                  }
                  toast.success('✅ Room shut successfully. Metadata stored.');
                  window.location.href = '/dashboard';
                } catch (err) {
                  toast.error('❌ Error occurred while shutting the room.');
                  window.__shuttingDown = false;
                }
              }}
              style={buttonStyle}
              disabled={window.__shuttingDown}
            >
              🚫 Shut
            </button>
          )}
          {!isOwner && (
            <button onClick={() => navigate('/dashboard')} style={buttonStyle}>
              🚪 Leave
            </button>
          )}
        </div>
      </div>
      {showShareModal && (
        <ShareRoomModal
          roomId={roomId}
          ownerId={user?.ownerId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Main content: File explorer + Editor */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        {/* Left: File structure + ChatBox */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 280,
            minWidth: 200,
            maxWidth: 600,
            background: '#252526',
            borderRight: '1px solid #3c3c3c',
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* File Explorer with its own scroll */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarColor: '#444 #23272f',
              scrollbarWidth: 'thin',
            }}
          >
            {/* Explorer Header */}
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #3c3c3c',
                backgroundColor: '#2d2d30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#cccccc',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <span style={{ fontSize: '14px' }}>📁</span>
                EXPLORER
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={handleAddFile}
                  className="vscode-icon-button"
                  title="New File"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cccccc',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '3px',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#3c3c3c')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                >
                  <FiFilePlus />
                </button>
                <button
                  onClick={handleAddFolder}
                  className="vscode-icon-button"
                  title="New Folder"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cccccc',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '3px',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = '#3c3c3c')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                >
                  <FiFolderPlus />
                </button>
              </div>
            </div>

            {/* File Tree Container */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '4px 0',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                fontSize: '13px',
              }}
            >
              {renderTree(fileTree)}
            </div>
          </div>
          {/* ChatBox at the bottom, same width, with its own scroll */}
          <div
            style={{
              width: '100%',
              minHeight: 220,
              maxHeight: 220,
              background: '#181c26',
              borderTop: '1px solid #333',
              overflow: 'hidden',
              boxShadow: '0 -2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <ChatBox roomId={roomId} />
          </div>
        </div>
        {/* Right: Editor (with its own scroll) */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
            background: '#121212',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Tabs section above the editor, with horizontal scroll */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '0.5rem',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollbarColor: '#444 #23272f',
              scrollbarWidth: 'thin',
              padding: '0.5rem 0.5rem 0 0.5rem',
            }}
          >
            {openTabs.map((tab) => (
              <div
                key={tab.name}
                style={{
                  padding: '0.3rem 0.75rem',
                  backgroundColor: tab === selectedFile ? '#333' : '#1f1f1f',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: getColorForFile(tab.name),
                  minWidth: 60,
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span onClick={() => setSelectedFile(tab)}>{tab.name}</span>
                <span
                  onClick={() => handleCloseTab(tab)}
                  style={{
                    marginLeft: '0.5rem',
                    color: '#aaa',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: '0 6px',
                    fontSize: '14px',
                  }}
                  onMouseOver={(e) => (e.target.style.color = '#fff')}
                  onMouseOut={(e) => (e.target.style.color = '#aaa')}
                >
                  ×
                </span>
              </div>
            ))}
          </div>
          {/* Editor area shrinks if OutputPanel is visible */}
          <div
            style={{
              width: '100%',
              flex: isOutputVisible ? '0 1 calc(100% - 240px)' : '1 1 100%',
              height: isOutputVisible ? 'calc(100% - 240px)' : '100%',
              overflow: 'auto',
              scrollbarColor: '#444 #23272f',
              scrollbarWidth: 'thin',
              transition: 'height 0.2s, flex 0.2s',
            }}
          >
            {selectedFile && selectedFile.type === 'file' && (
              <Editor
                height={isOutputVisible ? 'calc(100vh - 304px)' : 'calc(100vh - 104px)'}
                theme="vs-dark"
                language={selectedFile?.language || 'javascript'}
                value={selectedFile?.content || ''}
                onChange={handleEditorChange}
                options={{
                  fontSize: 16,
                  minimap: { enabled: false },
                  fontFamily: 'Fira Mono, monospace',
                  smoothScrolling: true,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  tabSize: 2,
                  insertSpaces: true,
                  cursorSmoothCaretAnimation: true,
                  formatOnPaste: true,
                  formatOnType: true,
                }}
              />
            )}
          </div>
          {/* OutputPanel as a bottom panel, like VS Code */}
          {isOutputVisible && (
            <div
              style={{
                width: '100%',
                height: 240,
                background: '#181c26',
                borderTop: '1px solid #333',
                zIndex: 200,
                overflow: 'auto',
                scrollbarColor: '#444 #23272f',
                scrollbarWidth: 'thin',
                boxShadow: '0 -2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <OutputPanel
                output={output}
                isExecuting={isExecuting}
                onCopy={handleCopyOutput}
                onClear={handleClearOutput}
                executionDetails={executionDetails}
                isVisible={isOutputVisible}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  backgroundColor: '#282c34',
  color: '#fff',
  border: '1px solid #444',
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
};
