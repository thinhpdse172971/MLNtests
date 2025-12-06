import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";

// Fallback questions in case API fails or key is missing (for robust demo)
const FALLBACK_QUESTIONS: Question[] = [
  {
    id: 1,
    questionText: "Ai là người sáng lập ra Chủ nghĩa xã hội khoa học?",
    options: ["V.I. Lênin", "K. Marx và F. Engels", "Hồ Chí Minh", "Hegel"],
    correctAnswerIndex: 1,
    explanation: "K. Marx và F. Engels là những người đặt nền móng và sáng lập ra Chủ nghĩa xã hội khoa học."
  },
  {
    id: 2,
    questionText: "Tác phẩm nào được coi là văn kiện cương lĩnh đầu tiên của chủ nghĩa xã hội khoa học?",
    options: ["Tư bản", "Tuyên ngôn của Đảng Cộng sản", "Hệ tư tưởng Đức", "Gia đình thần thánh"],
    correctAnswerIndex: 1,
    explanation: "Tuyên ngôn của Đảng Cộng sản (1848) là văn kiện cương lĩnh đầu tiên."
  },
  {
    id: 3,
    questionText: "Theo Lênin, cơ sở vật chất - kỹ thuật của chủ nghĩa xã hội là gì?",
    options: ["Nền đại công nghiệp cơ khí hóa", "Nền nông nghiệp công nghệ cao", "Kinh tế tri thức", "Công nghiệp hóa, hiện đại hóa"],
    correctAnswerIndex: 0,
    explanation: "Lênin nhấn mạnh nền đại công nghiệp cơ khí hóa là cơ sở vật chất của CNXH."
  }
];

export const generateQuestions = async (): Promise<Question[]> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key found, using fallback data.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    return FALLBACK_QUESTIONS;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Tạo danh sách 10 câu hỏi trắc nghiệm về 'Chủ nghĩa xã hội khoa học Mác - Lênin'. Nội dung cần chính xác, mang tính học thuật nhưng ngắn gọn. Mỗi câu hỏi có 4 lựa chọn, chỉ 1 đúng.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { 
                type: Type.INTEGER, 
                description: "Index of the correct answer (0-3)" 
              },
              explanation: {
                type: Type.STRING,
                description: "Short explanation of why the answer is correct"
              }
            },
            required: ["questionText", "options", "correctAnswerIndex"]
          }
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // Map to ensure IDs are present
      return data.map((q: any, index: number) => ({
        ...q,
        id: index + 1
      }));
    }
    
    throw new Error("Empty response from Gemini");

  } catch (error) {
    console.error("Failed to generate questions:", error);
    return FALLBACK_QUESTIONS;
  }
};