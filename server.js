const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 默认路由重定向到游戏页面
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

// 单机版路由
app.get('/single', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 提供静态文件（放在特定路由之后）
app.use(express.static('.'));

// 游戏房间管理
class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.spectators = [];
        this.board = this.initBoard();
        this.currentPlayer = 'triangle';
        this.gameState = 'waiting'; // waiting, playing, finished
        this.moveHistory = [];
    }

    initBoard() {
        const board = Array(5).fill(null).map(() => Array(5).fill(null));
        
        // 3个三角形放在上方
        board[0][1] = 'triangle';
        board[0][2] = 'triangle';
        board[0][3] = 'triangle';
        
        // 最下面三排全部是圆圈（15个）
        for (let row = 2; row <= 4; row++) {
            for (let col = 0; col < 5; col++) {
                board[row][col] = 'circle';
            }
        }
        
        return board;
    }

    addPlayer(socket) {
        if (this.players.length >= 2) {
            this.addSpectator(socket);
            return false;
        }

        const playerRole = this.players.length === 0 ? 'triangle' : 'circle';
        this.players.push({
            id: socket.id,
            socket: socket,
            role: playerRole,
            connected: true
        });

        if (this.players.length === 2) {
            this.gameState = 'playing';
        }

        return playerRole;
    }

    addSpectator(socket) {
        this.spectators.push({
            id: socket.id,
            socket: socket
        });
        socket.emit('spectatorMode', {
            board: this.board,
            currentPlayer: this.currentPlayer,
            moveHistory: this.moveHistory
        });
    }

    removePlayer(socketId) {
        const playerIndex = this.players.findIndex(p => p.id === socketId);
        if (playerIndex !== -1) {
            this.players[playerIndex].connected = false;
            // 不立即移除玩家，保留断线重连的机会
            return true;
        }

        // 移除观战者
        this.spectators = this.spectators.filter(s => s.id !== socketId);
        return false;
    }

    reconnectPlayer(socketId, newSocket) {
        const player = this.players.find(p => p.id === socketId);
        if (player && !player.connected) {
            player.socket = newSocket;
            player.connected = true;
            return player.role;
        }
        return null;
    }

    makeMove(fromRow, fromCol, toRow, toCol, playerRole) {
        if (this.currentPlayer !== playerRole) {
            return { success: false, error: '不是你的回合' };
        }

        if (!this.isValidMove(fromRow, fromCol, toRow, toCol)) {
            return { success: false, error: '无效的移动' };
        }

        // 保存移动历史
        const move = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: this.board[fromRow][fromCol],
            captured: null
        };

        // 如果是三角形跳跃到圆圈位置，吃掉圆圈
        if (this.board[fromRow][fromCol] === 'triangle' && this.board[toRow][toCol] === 'circle') {
            move.captured = {
                row: toRow,
                col: toCol,
                piece: 'circle'
            };
        }

        this.moveHistory.push(move);

        // 执行移动
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;

        // 切换玩家
        this.currentPlayer = this.currentPlayer === 'triangle' ? 'circle' : 'triangle';

        // 检查游戏状态
        const gameStatus = this.checkGameStatus();

        return {
            success: true,
            board: this.board,
            currentPlayer: this.currentPlayer,
            move: move,
            gameStatus: gameStatus
        };
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        
        if (!piece) return false;
        
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        // 所有棋子只能沿着横线或竖线移动，不能走对角线
        const isOrthogonal = (absRowDiff === 0 && absColDiff > 0) ||  // 水平
                            (absColDiff === 0 && absRowDiff > 0);      // 竖直
        
        if (!isOrthogonal) return false;
        
        if (piece === 'triangle') {
            // 情况1：普通移动 - 移动1格到空位
            if (this.board[toRow][toCol] === null) {
                const isOneStep = (absRowDiff === 1 && absColDiff === 0) ||  // 上下
                                 (absRowDiff === 0 && absColDiff === 1);     // 左右
                return isOneStep;
            }
            
            // 情况2：吃子 - 必须跳跃2格吃掉圆圈
            if (this.board[toRow][toCol] === 'circle') {
                const isJumpDistance = (absRowDiff === 2 && absColDiff === 0) || // 竖直跳跃
                                      (absRowDiff === 0 && absColDiff === 2);    // 水平跳跃
                
                if (!isJumpDistance) return false;
                
                // 检查中间位置（必须是空格才能跳跃吃子）
                const midRow = fromRow + Math.sign(rowDiff);
                const midCol = fromCol + Math.sign(colDiff);
                
                // 中间位置必须为空
                return this.board[midRow][midCol] === null;
            }
            
            // 不能移动到有三角形的位置
            return false;
            
        } else if (piece === 'circle') {
            // 圆圈只能上下左右移动1格
            const isOneStep = (absRowDiff === 1 && absColDiff === 0) ||  // 上下
                             (absRowDiff === 0 && absColDiff === 1);     // 左右
            
            if (!isOneStep) return false;
            
            // 目标位置必须为空
            return this.board[toRow][toCol] === null;
        }
        
        return false;
    }

    checkGameStatus() {
        const triangles = [];
        const circles = [];
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (this.board[row][col] === 'triangle') {
                    triangles.push({ row, col });
                } else if (this.board[row][col] === 'circle') {
                    circles.push({ row, col });
                }
            }
        }
        
        // 三角形获胜条件：吃掉所有圆圈
        if (circles.length === 0) {
            this.gameState = 'finished';
            return { finished: true, winner: 'triangle', message: '三角形获胜！圆圈全部被消灭！' };
        }
        
        // 检查三角形是否还能移动
        let triangleCanMove = false;
        for (const triangle of triangles) {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    if (this.isValidMove(triangle.row, triangle.col, row, col)) {
                        triangleCanMove = true;
                        break;
                    }
                }
                if (triangleCanMove) break;
            }
            if (triangleCanMove) break;
        }
        
        // 检查圆圈是否还能移动
        let circleCanMove = false;
        for (const circle of circles) {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    if (this.isValidMove(circle.row, circle.col, row, col)) {
                        circleCanMove = true;
                        break;
                    }
                }
                if (circleCanMove) break;
            }
            if (circleCanMove) break;
        }
        
        // 圆圈获胜条件：三角形无法移动（被完全围困）
        if (!triangleCanMove) {
            this.gameState = 'finished';
            return { finished: true, winner: 'circle', message: '圆圈获胜！三角形被完全围困！' };
        }
        
        // 平局条件：双方都无法移动（极少见的情况）
        if (!triangleCanMove && !circleCanMove) {
            this.gameState = 'finished';
            return { finished: true, winner: 'draw', message: '平局！双方都无法移动！' };
        }
        
        return { finished: false };
    }

    broadcast(event, data) {
        // 向所有玩家发送
        this.players.forEach(player => {
            if (player.connected) {
                player.socket.emit(event, data);
            }
        });
        
        // 向所有观战者发送
        this.spectators.forEach(spectator => {
            spectator.socket.emit(event, data);
        });
    }
}

// 房间管理
const rooms = new Map();
let waitingRoom = null;

// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log('新玩家连接:', socket.id);

    // 快速匹配
    socket.on('quickMatch', () => {
        if (waitingRoom && waitingRoom.players.length === 1) {
            // 加入等待中的房间
            const role = waitingRoom.addPlayer(socket);
            socket.join(waitingRoom.id);
            socket.emit('joinedRoom', {
                roomId: waitingRoom.id,
                role: role,
                board: waitingRoom.board,
                currentPlayer: waitingRoom.currentPlayer
            });
            
            // 通知所有人游戏开始
            waitingRoom.broadcast('gameStart', {
                board: waitingRoom.board,
                currentPlayer: waitingRoom.currentPlayer
            });
            
            rooms.set(waitingRoom.id, waitingRoom);
            waitingRoom = null;
        } else {
            // 创建新房间
            const roomId = 'room_' + Date.now();
            const room = new GameRoom(roomId);
            const role = room.addPlayer(socket);
            socket.join(roomId);
            
            socket.emit('joinedRoom', {
                roomId: roomId,
                role: role,
                board: room.board,
                currentPlayer: room.currentPlayer,
                waiting: true
            });
            
            waitingRoom = room;
        }
    });

    // 创建私人房间
    socket.on('createRoom', () => {
        const roomId = 'private_' + Math.random().toString(36).substr(2, 9);
        const room = new GameRoom(roomId);
        const role = room.addPlayer(socket);
        socket.join(roomId);
        
        rooms.set(roomId, room);
        
        socket.emit('roomCreated', {
            roomId: roomId,
            role: role,
            board: room.board,
            currentPlayer: room.currentPlayer
        });
    });

    // 加入指定房间
    socket.on('joinRoom', (roomId) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }

        const role = room.addPlayer(socket);
        if (role) {
            socket.join(roomId);
            socket.emit('joinedRoom', {
                roomId: roomId,
                role: role,
                board: room.board,
                currentPlayer: room.currentPlayer
            });

            if (room.gameState === 'playing') {
                room.broadcast('gameStart', {
                    board: room.board,
                    currentPlayer: room.currentPlayer
                });
            }
        }
    });

    // 处理移动
    socket.on('makeMove', (data) => {
        const room = rooms.get(data.roomId);
        if (!room) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
            socket.emit('error', { message: '你不是这个房间的玩家' });
            return;
        }

        const result = room.makeMove(
            data.fromRow,
            data.fromCol,
            data.toRow,
            data.toCol,
            player.role
        );

        if (result.success) {
            room.broadcast('moveUpdate', result);
        } else {
            socket.emit('moveError', result);
        }
    });

    // 请求撤销
    socket.on('requestUndo', (data) => {
        const room = rooms.get(data.roomId);
        if (!room || room.moveHistory.length === 0) return;

        const otherPlayer = room.players.find(p => p.id !== socket.id);
        if (otherPlayer && otherPlayer.connected) {
            otherPlayer.socket.emit('undoRequest', { from: socket.id });
        }
    });

    // 同意撤销
    socket.on('acceptUndo', (data) => {
        const room = rooms.get(data.roomId);
        if (!room || room.moveHistory.length === 0) return;

        const lastMove = room.moveHistory.pop();
        room.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        room.board[lastMove.to.row][lastMove.to.col] = null;

        if (lastMove.captured) {
            room.board[lastMove.captured.row][lastMove.captured.col] = lastMove.captured.piece;
        }

        room.currentPlayer = room.currentPlayer === 'triangle' ? 'circle' : 'triangle';

        room.broadcast('undoExecuted', {
            board: room.board,
            currentPlayer: room.currentPlayer
        });
    });

    // 断线处理
    socket.on('disconnect', () => {
        console.log('玩家断开连接:', socket.id);
        
        // 检查所有房间
        for (const [roomId, room] of rooms.entries()) {
            if (room.removePlayer(socket.id)) {
                room.broadcast('playerDisconnected', { playerId: socket.id });
                
                // 如果房间空了，删除房间
                if (room.players.every(p => !p.connected) && room.spectators.length === 0) {
                    rooms.delete(roomId);
                }
                break;
            }
        }
        
        // 检查等待房间
        if (waitingRoom && waitingRoom.players[0]?.id === socket.id) {
            waitingRoom = null;
        }
    });

    // 重连
    socket.on('reconnect', (data) => {
        const room = rooms.get(data.roomId);
        if (!room) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }

        const role = room.reconnectPlayer(data.playerId, socket);
        if (role) {
            socket.join(data.roomId);
            socket.emit('reconnected', {
                role: role,
                board: room.board,
                currentPlayer: room.currentPlayer,
                moveHistory: room.moveHistory
            });
            
            room.broadcast('playerReconnected', { playerId: data.playerId });
        }
    });

    // 发送消息
    socket.on('sendMessage', (data) => {
        const room = rooms.get(data.roomId);
        if (!room) return;

        room.broadcast('newMessage', {
            from: socket.id,
            message: data.message,
            timestamp: new Date()
        });
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    if (process.env.NODE_ENV === 'production') {
        console.log(`生产环境已启动`);
    } else {
        console.log(`访问 http://localhost:${PORT} 开始游戏`);
    }
});