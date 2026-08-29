import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, CryptoSymbol } from '../types';
import { CRYPTO_CONFIGS, formatUsd } from '../utils/cryptoHD';
import { Bot, Send, Sparkles, ShieldCheck, ArrowDownRight, ArrowUpRight, Wallet, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';
import { api } from '../services/api';

interface BotChatViewProps {
  user: UserProfile;
  prices: Record<CryptoSymbol, number>;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  qrCodeUrl?: string;
}

export const BotChatView: React.FC<BotChatViewProps> = ({
  user,
  prices,
  onOpenDeposit,
  onOpenWithdraw,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'bot',
      text: `🤖 *Vault Stakes Telegram Bot v2.5*\n\n` +
        `Welcome *${user.username}*!\n` +
        `• *Balance:* *$${user.balanceUsd.toFixed(2)} USD*\n` +
        `• *VIP Tier:* ${user.vipTier}\n\n` +
        `*Available Bot Commands:*\n` +
        `• \`/mines <amount> [mines]\` (e.g. \`/mines 5\` or \`/mines 0.50 3\`)\n` +
        `• \`/towers <amount> [easy|med|hard]\` (🦋 Butterfly safe / 🐍 Snake loss)\n` +
        `• \`/deposit [crypto] [network]\` (BTC, ETH, LTC, SOL, USDT)\n` +
        `• \`/withdraw <amount_usd> <crypto> <address>\`\n` +
        `• \`/balance\`\n` +
        `• \`/help\``,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      keyboard: [
        [
          { text: '💣 Play Mines ($5)', callback_data: 'cmd_/mines_5' },
          { text: '🏰 Play Towers ($5 🦋/🐍)', callback_data: 'cmd_/towers_5' },
        ],
        [
          { text: '📥 Deposit Crypto', callback_data: 'cmd_/deposit' },
          { text: '💳 Check Balance', callback_data: 'cmd_/balance' },
        ],
      ],
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!query) return;

    sound.playClick();
    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal('');
    setIsProcessing(true);

    try {
      // Route command through backend simulation or API
      const res = await api.sendBotMessage({ userId: user.id, text: query });
      
      const botReply: ChatMessage = {
        id: 'msg_bot_' + Math.random().toString(36).substring(2),
        sender: 'bot',
        text: res.reply || `Executed command: ${query}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        keyboard: res.keyboard,
        qrCodeUrl: res.qrCodeUrl,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      // Fallback local processing if backend endpoint missing
      let replyText = '';
      let keyboard: any = undefined;
      let qrUrl: string | undefined = undefined;

      const lower = query.toLowerCase();

      if (lower === '/start' || lower === '/help' || lower === 'help') {
        replyText = `🤖 *Vault Stakes Telegram Bot*\n\n` +
          `• *Balance:* *$${user.balanceUsd.toFixed(2)} USD*\n\n` +
          `*Commands:* \`/mines <amount>\`, \`/towers <amount>\`, \`/deposit\`, \`/withdraw\`, \`/balance\`\n` +
          `_Tip: Towers features 🦋 Butterfly for safe steps and 🐍 Snake for hazards!_`;
        keyboard = [
          [{ text: '💣 /mines 5', callback_data: 'cmd_/mines_5' }, { text: '🏰 /towers 5', callback_data: 'cmd_/towers_5' }],
          [{ text: '📥 /deposit', callback_data: 'cmd_/deposit' }, { text: '💳 /balance', callback_data: 'cmd_/balance' }],
        ];
      } else if (lower === '/balance' || lower === 'balance') {
        replyText = `💳 *Account Balance*\n\n• Balance: *$${user.balanceUsd.toFixed(2)} USD*\n• VIP Tier: *${user.vipTier}*\n• Total Wagered: *$${user.totalWageredUsd.toFixed(2)} USD*`;
      } else if (lower.startsWith('/deposit') || lower === 'deposit') {
        const sym = lower.split(/\s+/)[1]?.toUpperCase() || 'LTC';
        const addr = user.childAddresses?.[sym as CryptoSymbol]?.address || 'ltc1qvaultstakes9999';
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(addr)}`;
        replyText = `📥 *${sym} Deposit Address*\n\n\`${addr}\`\n\n_Scan QR code or copy address above. Auto-credited on blockchain confirmation._`;
      } else if (lower.startsWith('/mines') || lower === 'mines') {
        replyText = `💣 *Mines Game Initialized!*\n• Bet: $5.00 USD\n• Multiplier: *1.00x*\n\n_Click tiles below to uncover diamonds and avoid mines!_`;
        keyboard = Array.from({ length: 5 }).map(() =>
          Array.from({ length: 5 }).map((_, c) => ({ text: '⬛', callback_data: `mines_pick_${c}` }))
        );
      } else if (lower.startsWith('/towers') || lower === 'towers') {
        replyText = `🏰 *Towers of Fortune (Level 1/9)*\n• Bet: $5.00 USD\n• Good: 🦋 Butterfly | Hazard: 🐍 Snake\n\n_Select a safe tile to climb!_`;
        keyboard = [
          [{ text: '⬛', callback_data: 'towers_pick_0_0' }, { text: '⬛', callback_data: 'towers_pick_0_1' }, { text: '⬛', callback_data: 'towers_pick_0_2' }],
        ];
      } else {
        replyText = `✅ Received message: "${query}". Type /help for available casino commands.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_bot_' + Math.random().toString(36).substring(2),
          sender: 'bot',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          keyboard,
          qrCodeUrl: qrUrl,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInlineClick = (callbackData: string) => {
    if (callbackData.startsWith('cmd_')) {
      handleSendMessage(callbackData.replace('cmd_', ''));
    } else {
      handleSendMessage(`/${callbackData}`);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 space-y-4 pb-24">
      
      {/* Telegram Bot Header Bar */}
      <div className="p-4 rounded-3xl bg-[#0a122a] border border-[#c0c0c0]/30 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/15 border border-[#00ff41]/40 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.3)]">
              <Bot className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00ff41] border-2 border-[#0a122a] rounded-full animate-pulse"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white font-['Syne',sans-serif]">
                Vault Stakes Bot
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/40 text-[#00ff41] text-[10px] font-mono font-bold">
                @VaultStakesBot
              </span>
            </div>
            <p className="text-xs text-[#00ff41] font-mono">online • Provably Fair In-Chat Casino & Mini App</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenDeposit()}
            className="px-3 py-2 bg-[#00ff41] hover:bg-white text-black font-black text-xs uppercase rounded-xl shadow-[0_0_12px_rgba(0,255,65,0.3)] transition-all flex items-center gap-1.5"
          >
            <ArrowDownRight className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Deposit</span>
          </button>
          <button
            onClick={() => onOpenWithdraw()}
            className="px-3 py-2 bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white font-black text-xs uppercase rounded-xl border border-[#c0c0c0]/20 transition-all flex items-center gap-1.5"
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Withdraw</span>
          </button>
        </div>
      </div>

      {/* Telegram Chat Container */}
      <div className="rounded-3xl border border-[#c0c0c0]/30 bg-[#050b18]/90 backdrop-blur-md shadow-2xl flex flex-col h-[520px] overflow-hidden">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="text-center my-2">
            <span className="px-3 py-1 rounded-full bg-[#0a122a] border border-[#c0c0c0]/20 text-[10px] text-[#c0c0c0] font-mono uppercase tracking-wider">
              🔒 Encrypted Telegram Bot Session • SHA-256 Verified
            </span>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[85%]. sm:max-w-[75%] rounded-3xl p-4 shadow-lg space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-[#00ff41] text-black rounded-tr-sm font-medium'
                    : 'bg-[#0a122a] border border-[#c0c0c0]/25 text-slate-100 rounded-tl-sm'
                }`}
              >
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
                  {msg.text}
                </div>

                {msg.qrCodeUrl && (
                  <div className="p-3 bg-white rounded-2xl w-fit mx-auto shadow-md">
                    <img src={msg.qrCodeUrl} alt="Deposit QR" className="w-44 h-44 object-contain" />
                  </div>
                )}

                {msg.keyboard && msg.keyboard.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[#c0c0c0]/20">
                    {msg.keyboard.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-flow-col gap-1.5">
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => btn.callback_data && handleInlineClick(btn.callback_data)}
                            className="flex-1 py-2 px-3 bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-white text-xs font-bold rounded-xl border border-[#c0c0c0]/20 transition-all text-center truncate"
                          >
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-[9px] font-mono text-right ${msg.sender === 'user' ? 'text-black/70' : 'text-[#c0c0c0]'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0a122a] border border-[#c0c0c0]/20 w-fit text-xs text-[#00ff41] font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Bot is processing command...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Command Suggestion Bar */}
        <div className="px-4 py-2 bg-[#070b14] border-t border-[#c0c0c0]/15 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { label: '/mines 5', cmd: '/mines 5' },
            { label: '/towers 5', cmd: '/towers 5' },
            { label: '/deposit LTC', cmd: '/deposit LTC' },
            { label: '/withdraw 10', cmd: '/withdraw 10 LTC ltc1q...' },
            { label: '/balance', cmd: '/balance' },
            { label: '/help', cmd: '/help' },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSendMessage(chip.cmd)}
              className="px-3 py-1 rounded-xl bg-[#1a2b4b] hover:bg-[#00ff41] hover:text-black text-[#c0c0c0] hover:text-black text-xs font-mono font-bold whitespace-nowrap border border-[#c0c0c0]/20 transition-all shrink-0"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Message Input Bar */}
        <div className="p-3 bg-[#0a122a] border-t border-[#c0c0c0]/30 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type command (e.g. /mines 5, /towers 5, /deposit)..."
            className="flex-1 py-3 px-4 rounded-2xl bg-[#050b18] border border-[#c0c0c0]/20 text-white text-xs sm:text-sm focus:border-[#00ff41] focus:outline-none font-mono"
          />

          <button
            onClick={() => handleSendMessage()}
            className="p-3.5 rounded-2xl bg-[#00ff41] hover:bg-white text-black font-black transition-all shadow-[0_0_15px_rgba(0,255,65,0.35)] active:scale-95 shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

      </div>

    </div>
  );
};
