import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, X, Sparkles, Volume2, 
  RefreshCw, AlertCircle, Plus 
} from 'lucide-react';
import { parseThaiVoiceItem, type ParsedVoiceItem } from '../../utils/thaiVoiceParser';

interface VoiceItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }) => void;
}

export const VoiceItemModal: React.FC<VoiceItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          setTranscript(final);
          setInterimTranscript('');
          const parsed = parseThaiVoiceItem(final);
          setParsedResult(parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน กรุณากดอนุญาตสิทธิ์ไมโครโฟน');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`เกิดข้อผิดพลาดในการรับเสียง: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e: any) {
      console.error(e);
      setIsSupported(false);
    }
  }, []);

  // Auto-start listening when modal opens
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setInterimTranscript('');
      setParsedResult(null);
      setErrorMessage(null);
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.abort();
      setErrorMessage(null);
      recognitionRef.current.start();
    } catch {
      // Ignored if already started
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
    setIsListening(false);
  };

  const handleTestExample = (sampleText: string) => {
    setTranscript(sampleText);
    setInterimTranscript('');
    const parsed = parseThaiVoiceItem(sampleText);
    setParsedResult(parsed);
  };

  const handleConfirmAdd = () => {
    if (!parsedResult) return;
    onAddItem({
      description: parsedResult.description,
      quantity: parsedResult.quantity,
      unit: parsedResult.unit,
      unit_price: parsedResult.unit_price,
      total_price: parsedResult.total_price,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/80 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-display">
                บันทึกรายการด้วยเสียง (Thai Voice Entry)
              </h3>
              <p className="text-xs text-slate-500">พูดชื่อสินค้า จำนวน หน่วยนับ และราคา เพื่อลงตารางทันที</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if not supported */}
        {!isSupported && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">เบราว์เซอร์นี้ไม่รองรับ Web Speech API</p>
              <p className="text-[11px] text-amber-700 mt-0.5">แนะนำให้เปิดผ่าน Google Chrome หรือ Microsoft Edge เพื่อใช้ฟังก์ชันสั่งงานด้วยเสียง</p>
            </div>
          </div>
        )}

        {/* Voice Visualizer / Pulse Orb */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            disabled={!isSupported}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isListening
                ? 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white scale-110 shadow-rose-500/30'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:scale-105 shadow-blue-500/25'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping" />
            )}
            {isListening ? (
              <Mic className="w-8 h-8 animate-pulse" />
            ) : (
              <MicOff className="w-8 h-8 opacity-90" />
            )}
          </button>

          <div className="text-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isListening 
                ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500' : 'bg-slate-400'}`} />
              <span>{isListening ? 'กำลังรับฟังเสียงภาษาไทย... (พูดได้เลย)' : 'กดปุ่มไมค์เพื่อเริ่มพูดใหม่'}</span>
            </span>
          </div>
        </div>

        {/* Realtime Transcript Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 min-h-[70px] flex flex-col justify-center text-center">
          {interimTranscript && (
            <p className="text-xs text-slate-400 italic">
              {interimTranscript}...
            </p>
          )}
          {transcript ? (
            <p className="text-sm font-bold text-slate-800 font-sans">
              "{transcript}"
            </p>
          ) : !interimTranscript && (
            <p className="text-xs text-slate-400">
              ตัวอย่างการพูด: "ค่าหมึกพิมพ์ 2 กล่อง หนึ่งพันสองร้อยบาท"
            </p>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <p className="text-xs text-rose-600 text-center font-medium">
            {errorMessage}
          </p>
        )}

        {/* Parsed Result Card */}
        {parsedResult && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/70 border border-blue-200/80 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 border-b border-blue-200/60 pb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>ผลการถอดข้อความเป็นรายการพัสดุ:</span>
              </span>
              <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono">
                ฿ {parsedResult.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                <span className="text-[10px] text-slate-500 block">รายการ</span>
                <span className="font-bold text-slate-800 truncate block" title={parsedResult.description}>
                  {parsedResult.description}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                <span className="text-[10px] text-slate-500 block">จำนวน</span>
                <span className="font-bold text-slate-800 font-mono">
                  {parsedResult.quantity}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                <span className="text-[10px] text-slate-500 block">หน่วย</span>
                <span className="font-bold text-slate-800">
                  {parsedResult.unit}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                <span className="text-[10px] text-slate-500 block">ราคา/หน่วย</span>
                <span className="font-bold text-slate-800 font-mono">
                  {parsedResult.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Sample Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-slate-400" />
            <span>หรือคลิกทดสอบตัวอย่างคำพูด:</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              'ค่าหมึกพิมพ์ 2 กล่อง หนึ่งพันสองร้อยบาท',
              'กระดาษถ่ายเอกสาร A4 5 รีม 750 บาท',
              'ปากกาลูกลื่น 10 ด้าม 150 บาท',
              'แฟ้มสันกว้าง 3 เล่ม 360 บาท'
            ].map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTestExample(sample)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-100/70 text-slate-600 hover:text-blue-700 text-[11px] font-medium transition"
              >
                + "{sample}"
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={startListening}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>พูดใหม่</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmAdd}
            disabled={!parsedResult}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มลงในบิลทันที</span>
          </button>
        </div>
      </div>
    </div>
  );
};
