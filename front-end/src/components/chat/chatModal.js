// components/chat/ChatModal.js
"use client";
import { useState, useRef, useEffect } from "react";
import ChatMessage from "./chatMessage.js";
import { IoIosCloseCircle, IoIosSend, IoIosMic } from "react-icons/io";
import { RxAvatar } from "react-icons/rx";
import { BsEmojiSmileFill } from "react-icons/bs";
import { IoSend } from "react-icons/io5";

export default function ChatModal({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userName, setUserName] = useState("Usuário");
  const [userLevel, setUserLevel] = useState(1); // 0 = agent, 1 = user
  const [isAgent, setIsAgent] = useState(false);
  
  // Debug: monitora mudanças no estado isAgent
  useEffect(() => {
    console.log('🔄 Estado isAgent alterado:', isAgent);
  }, [isAgent]);

  // Debug: monitora mudanças no userLevel
  useEffect(() => {
    console.log('🔄 Estado userLevel alterado:', userLevel);
  }, [userLevel]);

  // VALIDAÇÃO SIMPLES: Sincronizar estados com localStorage
  useEffect(() => {
    const userData = getUserData();
    
    // Verificar se há diferença significativa
    if (userData.nivel !== userLevel || userData.isAgent !== isAgent || userData.nome !== userName) {
      console.log("🔧 Sincronizando estados com localStorage:", {
        localStorage: { nivel: userData.nivel, isAgent: userData.isAgent, nome: userData.nome },
        estado: { nivel: userLevel, isAgent: isAgent, nome: userName }
      });
      
      // Sincronizar estados
      setUserLevel(userData.nivel);
      setIsAgent(userData.isAgent);
      setUserName(userData.nome);
    }
  }, [userLevel, isAgent, userName]); // Executar quando os estados mudarem

  const [connectedUsers, setConnectedUsers] = useState([]); // Lista de usuários para agentes
  const [selectedUser, setSelectedUser] = useState(null); // Usuário selecionado pelo agente
  const [lastUpdate, setLastUpdate] = useState(new Date()); // Timestamp da última atualização
  const inputRef = useRef();
  const listRef = useRef();

  // Helper para montar URL do WS a partir da URL da API
  const getWebSocketUrl = () => {
    try {
      // 1. Primeiro, tentar usar a variável de ambiente
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      if (apiUrl) {
        console.log("🔧 Usando NEXT_PUBLIC_API_URL:", apiUrl);
        return apiUrl.replace(/^http/, "ws");
      }
      
      // 2. Fallback baseado no ambiente atual
      if (typeof window !== "undefined") {
        const { protocol, hostname, port } = window.location;
        const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
        
        console.log("🔧 Detectando ambiente:", { protocol, hostname, port });
        
        // Em desenvolvimento local
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          const wsUrl = `${wsProtocol}//${hostname}:4000`;
          console.log("🏠 Ambiente local detectado:", wsUrl);
          return wsUrl;
        }
        
        // Em produção Vercel (frontend) - backend no Render
        if (hostname.includes('.vercel.app')) {
          const wsUrl = "wss://imobiliaria-bortone.onrender.com";
          console.log("🚀 Vercel detectado, usando backend Render:", wsUrl);
          return wsUrl;
        }
        
        // Em produção Render (fullstack)
        if (hostname.includes('.onrender.com')) {
          const wsUrl = `${wsProtocol}//${hostname}`;
          console.log("☁️ Render detectado:", wsUrl);
          return wsUrl;
        }
        
        // Fallback geral para outros ambientes de produção
        const wsUrl = `${wsProtocol}//${hostname}${port ? `:${port}` : ""}`;
        console.log("🌐 Ambiente genérico:", wsUrl);
        return wsUrl;
      }
      
      // Fallback final
      console.log("⚠️ Usando fallback localhost");
      return "ws://localhost:4000";
    } catch (error) {
      console.error("❌ Erro ao construir URL do WebSocket:", error);
      return "ws://localhost:4000";
    }
  };

  // Helper para ler dados do usuário
  const getUserData = () => {
    const token = localStorage.getItem("authToken");
    const userInfoString = localStorage.getItem("userInfo") || "{}";
    const info = JSON.parse(userInfoString);
    
    // Usar diretamente o nível do banco de dados
    let nivel = info?.nivel || 1;
    
    // Converter para número se for string
    const nivelNumerico = typeof nivel === 'string' ? parseInt(nivel, 10) : nivel;
    const isAgent = nivelNumerico === 0;
    
    return {
      token,
      info,
      nome: info?.nome || "Usuário",
      userId: info?.id || null,
      nivel: nivelNumerico,
      isAgent
    };
  };

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Atualização automática do timestamp para agentes (a cada minuto)
  useEffect(() => {
    if (!isAgent) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [isAgent]);

  // Conexão WebSocket
  useEffect(() => {
    // Verificar se localStorage tem dados
    const userInfoString = localStorage.getItem("userInfo");
    const token = localStorage.getItem("authToken");
    
    if (!userInfoString || !token) {
      console.warn("⚠️ Dados de autenticação não encontrados no localStorage");
      setMessages([{
        id: Date.now(),
        sender: "support",
        text: "❌ Você precisa fazer login para usar o chat.",
        timestamp: new Date(),
      }]);
      return;
    }
    
    // Usar função isolada para evitar conflitos
    const userData = getUserData();
    
    if (!userData.token || !userData.userId) {
      console.warn("⚠️ Token ou userId inválidos:", { 
        hasToken: !!userData.token, 
        hasUserId: !!userData.userId 
      });
      setMessages([{
        id: Date.now(),
        sender: "support",
        text: "❌ Dados de autenticação inválidos. Faça login novamente.",
        timestamp: new Date(),
      }]);
      return;
    }

    console.log("✅ Dados de usuário válidos encontrados:", {
      userId: userData.userId,
      nome: userData.nome,
      nivel: userData.nivel,
      isAgent: userData.isAgent
    });

    // Atualizar estados UMA ÚNICA VEZ
    setUserName(userData.nome);
    setUserLevel(userData.nivel);
    setIsAgent(userData.isAgent);

    // Definir mensagem inicial baseada no nível do usuário
    const initialMessage = {
      id: 1,
      sender: "support",
      text: userData.nivel === 0 
        ? "Bem-vindo ao painel de atendimento! Selecione um usuário para conversar."
        : "Olá! Como posso ajudar você hoje?",
      timestamp: new Date()
    };
    
    setMessages([initialMessage]);

    let socket;
    let reconnectTimer;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connect = () => {
      const baseWsUrl = getWebSocketUrl();
      const wsUrl = `${baseWsUrl}?token=${userData.token}`;
      
      console.log("🔌 Tentando conectar WebSocket:", {
        attempt: reconnectAttempts + 1,
        maxAttempts: maxReconnectAttempts,
        baseUrl: baseWsUrl,
        fullUrl: wsUrl,
        userId: userData.userId,
        nome: userData.nome,
        nivel: userData.nivel
      });
      
      try {
        socket = new WebSocket(wsUrl);
        setWs(socket);

        socket.onopen = () => {
          console.log("✅ WebSocket conectado com sucesso");
          setIsConnected(true);
          reconnectAttempts = 0; // Reset counter on successful connection
          
          // Limpar mensagens de erro anteriores
          setMessages((prev) => prev.filter(msg => !msg.text.includes("Erro de conexão")));
          
          // Envia mensagem de conexão diferente para agentes e usuários
          const connectMessage = userData.nivel === 0 
            ? {
                type: "connect", 
                token: userData.token, 
                userId: userData.userId,
                nome: userData.nome
              }
            : {
                type: "connect", 
                token: userData.token, 
                nome: userData.nome
              };
              
          console.log("📤 Enviando mensagem de conexão:", connectMessage);
          socket.send(JSON.stringify(connectMessage));
        };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verificar se alguma mensagem está alterando dados do usuário
          if (data.userLevel !== undefined || data.nivel !== undefined || data.isAgent !== undefined) {
            console.warn("⚠️ ALERTA - WebSocket tentando alterar dados do usuário:", data);
          }
          
          // Mensagem comum (pode vir em dois formatos do backend)
          if (data.type === "message") {
            // Formato quando vem de agente: { type, msg: { userId, text } }
            if (data.msg) {
              const fromMe = data.msg.fromUserId === userData.userId || data.msg.userId === userData.userId;
              setMessages((prev) => [
                ...prev,
                {
                  id: data.msg.timestamp || Date.now(),
                  sender: fromMe ? "user" : "support",
                  text: data.msg.text,
                  timestamp: data.msg.timestamp ? new Date(data.msg.timestamp) : new Date(),
                },
              ]);
            } else {
              // Formato broadcast em desenvolvimento entre usuários
              const fromMe = data.fromUserId === userData.userId;
              setMessages((prev) => [
                ...prev,
                {
                  id: data.timestamp || Date.now(),
                  sender: fromMe ? "user" : "support",
                  text: data.text,
                  timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
                },
              ]);
            }
          }

          // Histórico
          if (data.type === "history") {
            // Para agentes, pode receber histórico de usuários específicos
            if (userData.isAgent && data.userId) {
              // Histórico específico de um usuário
              const list = Array.isArray(data.messages) ? data.messages : [];
              const mapped = list.map((m, idx) => ({
                id: m.timestamp || `${Date.now()}-${idx}`,
                sender: m.userId === userData.userId ? "user" : "support", // Agente é "user", cliente é "support"
                text: m.text || (m.msg && m.msg.text) || "",
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              }));
              setMessages(mapped);
            } else if (!userData.isAgent) {
              // Para usuários normais, processar histórico normalmente
              const list = Array.isArray(data.messages) ? data.messages : [];
              const mapped = list.map((m, idx) => {
                const fromMe = m.fromUserId === userData.userId;
                return {
                  id: m.timestamp || `${Date.now()}-${idx}`,
                  sender: fromMe ? "user" : "support",
                  text: m.text || (m.msg && m.msg.text) || "",
                  timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                };
              });
              setMessages((prev) => {
                const header = prev.length && prev[0]?.id === 1 ? [prev[0]] : [];
                return [...header, ...mapped];
              });
            }
          }

          // Lista de usuários conectados (apenas para agentes)
          if (data.type === "users" && userData.isAgent) {
            setConnectedUsers(data.users || []);
            setLastUpdate(new Date()); // Atualizar timestamp
          }

          // Status/informativos
          if (data.type === "status") {
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), sender: "support", text: data.msg, timestamp: new Date() },
            ]);
          }

          // Erros
          if (data.error) {
            setMessages((prev) => [
              ...prev,
              { id: Date.now(), sender: "support", text: `Erro: ${data.error}` },
            ]);
          }
        } catch (e) {
          console.error("Falha ao processar mensagem WS:", e);
        }
      };

      socket.onclose = (event) => {
        console.log("❌ WebSocket fechado:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          attempt: reconnectAttempts + 1
        });
        setIsConnected(false);
        
        // Só tentar reconectar se não excedeu o limite
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Backoff exponencial, máximo 10s
          
          console.log(`🔄 Tentando reconectar em ${delay}ms (tentativa ${reconnectAttempts}/${maxReconnectAttempts})`);
          
          reconnectTimer = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error("❌ Máximo de tentativas de reconexão excedido");
          setMessages((prev) => [
            ...prev,
            { 
              id: Date.now(), 
              sender: "support", 
              text: "❌ Não foi possível conectar ao servidor. Verifique sua conexão.",
              timestamp: new Date()
            },
          ]);
        }
      };

      socket.onerror = (error) => {
        console.error("🚨 Erro no WebSocket:", error);
        setIsConnected(false);
        
        // Mostrar erro apenas se não for um erro de reconexão
        if (reconnectAttempts === 0) {
          setMessages((prev) => [
            ...prev,
            { 
              id: Date.now(), 
              sender: "support", 
              text: "❌ Erro de conexão. Tentando reconectar...",
              timestamp: new Date()
            },
          ]);
        }
      };
      } catch (connectionError) {
        console.error("❌ Erro ao criar WebSocket:", connectionError);
        setIsConnected(false);
        setMessages((prev) => [
          ...prev,
          { 
            id: Date.now(), 
            sender: "support", 
            text: `❌ Erro ao conectar: ${connectionError.message}`,
            timestamp: new Date()
          },
        ]);
      }
    };

    connect();
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { socket && socket.close(); } catch {}
    };
  }, []); // ⚠️ IMPORTANTE: Array vazio para evitar re-execução

  // Enviar mensagem com validação robusta
  const handleSend = () => {
    if (!newMessage.trim() || !ws || !isConnected) return;
    
    // VALIDAÇÃO CRÍTICA: Re-verificar dados do usuário antes de enviar
    const currentUserData = getUserData();
    
    // Atualizar estados se necessário (correção em tempo real)
    if (currentUserData.nivel !== userLevel || currentUserData.isAgent !== isAgent) {
      console.warn("🚨 CORREÇÃO CRÍTICA no envio - Atualizando estados:", {
        antes: { nivel: userLevel, isAgent },
        depois: { nivel: currentUserData.nivel, isAgent: currentUserData.isAgent }
      });
      
      setUserLevel(currentUserData.nivel);
      setIsAgent(currentUserData.isAgent);
      setUserName(currentUserData.nome);
    }
    
    let payload = { type: "message", text: newMessage.trim() };
    
    // Se for agente, precisa especificar para qual usuário enviar
    if (currentUserData.isAgent && selectedUser) {
      payload.to = selectedUser;
      console.log("📤 AGENTE enviando mensagem para usuário:", selectedUser);
    } else if (currentUserData.isAgent && !selectedUser) {
      // Agente sem usuário selecionado
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "support", text: "⚠️ Selecione um usuário para enviar mensagem." },
      ]);
      return;
    }
    
    try {
      ws.send(JSON.stringify(payload));
      // Adiciona localmente para feedback imediato
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "user", text: newMessage.trim(), timestamp: new Date() },
      ]);
      setNewMessage("");
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: "support", text: "Falha ao enviar. Tente novamente." },
      ]);
    }
  };

  const addEmoji = (emoji) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  // VALIDAÇÃO FINAL: Verificar estado antes da renderização
  const finalUserData = getUserData();
  const finalIsAgent = finalUserData.isAgent;
  const finalUserLevel = finalUserData.nivel;
  
  // Debug para identificar inconsistências na renderização
  if (finalIsAgent !== isAgent || finalUserLevel !== userLevel) {
    console.warn("🚨 INCONSISTÊNCIA NA RENDERIZAÇÃO:", {
      localStorage: { nivel: finalUserLevel, isAgent: finalIsAgent },
      estado: { nivel: userLevel, isAgent: isAgent },
      email: finalUserData.info?.email
    });
  }

  return (
    <div
      className="
      fixed z-[9999]
      inset-0 w-full h-full rounded-none
      md:inset-auto md:bottom-4 md:right-4 md:w-[90%] md:max-w-sm md:h-[70vh] md:rounded-2xl
      bg-white shadow-lg flex flex-col overflow-hidden
      animate-slideUpFade
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-[#4C62AE]">
        <div className="flex items-center gap-2">
          <RxAvatar className="w-8 h-8 md:w-10 md:h-10" color="white" />
          <div>
            <h2 className="text-sm md:text-base text-white font-semibold">
              {finalIsAgent ? "Painel de Atendimento" : "Suporte Imobiliária Bortone"}
            </h2>
            <p className="text-xs text-white/80">
              {isConnected ? "🟢 Online" : "🔴 Conectando..."} • {finalUserData.nome}
              {finalIsAgent && ` (Agente)`}
            </p>
          </div>
        </div>

        <button onClick={onClose}>
          <IoIosCloseCircle 
            className="w-8 h-8 md:w-10 md:h-10 transition-transform hover:scale-110"
            color="white"
          />
        </button>
      </div>

      {/* Mensagens */}
      <div className="flex flex-1 overflow-hidden">
        {/* Painel lateral de usuários - SEMPRE visível para agentes */}
        {finalIsAgent && (
          <div className="w-1/3 border-r bg-gray-100 flex flex-col">
            <div className="p-2 bg-gray-200 text-sm font-semibold text-gray-700 border-b">
              <div className="flex items-center justify-between">
                <span>👥 Usuários Online</span>
                <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                  {connectedUsers.length}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {connectedUsers.length > 0 ? (
                // Lista de usuários online
                connectedUsers.map((user) => (
                  <div
                    key={user.userId}
                    onClick={() => setSelectedUser(user.userId)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-200 transition-colors ${
                      selectedUser === user.userId ? 'bg-blue-100 border-blue-300' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800 flex items-center">
                          🟢 {user.nome}
                        </div>
                        <div className="text-xs text-gray-500">ID: {user.userId}</div>
                      </div>
                      {selectedUser === user.userId && (
                        <div className="text-blue-500 text-xs">💬 Ativo</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                // Estado quando não há usuários
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                  <div className="text-4xl mb-3">👨‍💼</div>
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    Aguardando usuários
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    Usuários que acessarem o chat aparecerão aqui
                  </div>
                  <div className="text-xs bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg">
                    💡 Pronto para atender
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer do painel */}
            <div className="p-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
              {isConnected ? (
                <span className="text-green-600">🟢 Painel Ativo</span>
              ) : (
                <span className="text-red-600">🔴 Reconectando...</span>
              )}
            </div>
          </div>
        )}

        {/* Área de mensagens */}
        <div className={`flex flex-col ${finalIsAgent ? 'flex-1' : 'w-full'}`}>
          {finalIsAgent && selectedUser && (
            <div className="p-2 bg-blue-50 text-sm text-blue-700 border-b">
              Conversando com: {connectedUsers.find(u => u.userId === selectedUser)?.nome || `Usuário ${selectedUser}`}
            </div>
          )}
          
          <div ref={listRef} className="flex-1 p-3 space-y-2 overflow-y-auto bg-gray-50">
            {messages.map((msg, idx) => (
              <ChatMessage key={msg.id ? msg.id : `msg-${idx}`} sender={msg.sender} text={msg.text} />
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="relative flex items-center border-t p-2 gap-2 bg-[#4C62AE]">
        {/* Status para agentes */}
        {finalIsAgent && !selectedUser && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-sm text-center">
              Selecione um usuário para conversar
            </div>
          </div>
        )}

        {/* Emoji */}
        <div className="relative">
          <BsEmojiSmileFill 
            className="w-8 h-8 cursor-pointer hover:scale-110 transition"
            color="white"
            onClick={() => setShowEmojis(!showEmojis)}
          />
          {showEmojis && (
            <div
              className="absolute bottom-10 left-0 w-48 bg-white rounded-lg shadow-lg p-2 
                         flex flex-wrap gap-2 z-50 animate-emojiOpen"
            >
              {["😀", "😂", "😍", "👍", "🔥", "🎉", "🙌", "🤔", "😢", "👏"].map(
                (emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-xl hover:scale-125 transition"
                  >
                    {emoji}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* Campo texto */}
        <input
          ref={inputRef}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            finalIsAgent && !selectedUser 
              ? "Selecione um usuário primeiro..." 
              : "Digite sua mensagem..."
          }
          className="flex-1 bg-white rounded-3xl px-3 py-2 text-sm focus:outline-none 
                     focus:ring focus:ring-blue-300"
          disabled={!isConnected || (finalIsAgent && !selectedUser)}
        />

        {/* Botão enviar */}
        <button
          onClick={handleSend}
          disabled={!isConnected || (finalIsAgent && !selectedUser)}
          className={`flex w-10 h-10 rounded-full items-center justify-center 
                     hover:scale-110 transition ${
                       isConnected && (!isAgent || selectedUser) ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
                     }`}
        >
          <IoSend color="white" className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}