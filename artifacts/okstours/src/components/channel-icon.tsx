import { FaTelegramPlane, FaWhatsapp, FaInstagram, FaGlobe, FaSms, FaEnvelope } from "react-icons/fa";

export function ChannelIcon({ channel, className = "h-4 w-4" }: { channel: string; className?: string }) {
  switch (channel) {
    case "telegram":
      return <FaTelegramPlane className={`text-[#0088cc] ${className}`} />;
    case "whatsapp":
      return <FaWhatsapp className={`text-[#25D366] ${className}`} />;
    case "instagram":
      return <FaInstagram className={`text-[#E1306C] ${className}`} />;
    case "web":
      return <FaGlobe className={`text-slate-500 ${className}`} />;
    case "sms":
      return <FaSms className={`text-slate-600 ${className}`} />;
    case "email":
      return <FaEnvelope className={`text-slate-600 ${className}`} />;
    default:
      return <FaGlobe className={`text-slate-400 ${className}`} />;
  }
}
