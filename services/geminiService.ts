
import { GoogleGenAI, Type } from "@google/genai";
import { Member, AttendanceRecord } from "../types";

// Helper to safely get API key from environment
const getApiKey = () => {
  try {
    return process.env.API_KEY;
  } catch (e) {
    return null;
  }
};

export const getAttendanceInsights = async (members: Member[], attendance: AttendanceRecord[]) => {
  const apiKey = getApiKey();
  if (!apiKey || attendance.length === 0) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Analyze the following church attendance data for the last month. 
    Members: ${JSON.stringify(members)}
    Attendance Records: ${JSON.stringify(attendance)}
    
    Identify:
    1. A brief overall summary.
    2. Members who have missed more than 2 Sundays in the last month (At Risk).
    3. Trends in growth or decline.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            atRiskMembers: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            growthTrend: { type: Type.STRING }
          },
          required: ["summary", "atRiskMembers", "growthTrend"],
          propertyOrdering: ["summary", "atRiskMembers", "growthTrend"]
        }
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Insight Error:", error);
    return null;
  }
};
