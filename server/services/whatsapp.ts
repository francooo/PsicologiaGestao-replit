import axios from 'axios';

// Constantes
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

// Interfaces
export interface WhatsappMessageTemplateResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WhatsappError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

/**
 * Envia uma mensagem de texto simples via WhatsApp
 * @param phoneNumber Número de telefone no formato internacional (e.g., 5511999999999)
 * @param message Texto da mensagem a ser enviada
 * @returns Promise com a resposta da API ou erro
 */
export async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data as WhatsappError;
    }
    throw error;
  }
}

/**
 * Verifica a validade do número de telefone e formata corretamente
 * @param phone Número de telefone
 * @returns Número formatado ou null se inválido
 */
export function formatPhoneNumber(phone: string): string | null {
  // Remove todos os caracteres não numéricos
  let digitsOnly = phone.replace(/\D/g, '');
  
  // Adiciona código do país (55 - Brasil) se não estiver presente
  if (digitsOnly.length === 11 || digitsOnly.length === 10) {
    digitsOnly = `55${digitsOnly}`;
  }
  
  // Verifica se o número está no formato internacional válido
  // (Entre 10 e 15 dígitos com código do país)
  if (digitsOnly.length >= 12 && digitsOnly.length <= 15) {
    return digitsOnly;
  }
  
  return null;
}

/**
 * Compartilha horários disponíveis de um psicólogo via WhatsApp
 * @param phoneNumber Número do cliente
 * @param message Mensagem formatada para enviar (com links do Google Calendar)
 */
export async function sendWhatsAppAvailability(
  phoneNumber: string,
  message: string
) {
  // Formata o número de telefone
  const formattedPhone = formatPhoneNumber(phoneNumber);
  if (!formattedPhone) {
    throw new Error('Número de telefone inválido');
  }
  
  // Envia a mensagem formatada externamente
  return sendWhatsAppMessage(formattedPhone, message);
}

/**
 * Formata a mensagem para compartilhamento de horários via WhatsApp
 */
function formatWhatsAppMessage(
  psychologistName: string,
  customMessage: string,
  availableTimes: { date: string, slots: string[] }[],
  startDate: Date,
  endDate: Date
): string {
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  let message = customMessage.trim() ? customMessage + "\n\n" : "";
  
  message += `*Horários disponíveis - ${psychologistName}*\n`;
  message += `Período: ${dateFormatter.format(startDate)} a ${dateFormatter.format(endDate)}\n\n`;
  
  availableTimes.forEach(item => {
    const date = new Date(item.date);
    message += `*${dateFormatter.format(date)} (${getDayOfWeek(date)})*\n`;
    
    if (item.slots.length === 0) {
      message += "Sem horários disponíveis neste dia.\n";
    } else {
      item.slots.forEach(slot => {
        message += `- ${slot}\n`;
      });
    }
    message += "\n";
  });
  
  message += "Para agendar, entre em contato diretamente ou responda a esta mensagem.";
  
  return message;
}

/**
 * Retorna o dia da semana em português
 */
function getDayOfWeek(date: Date): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[date.getDay()];
}