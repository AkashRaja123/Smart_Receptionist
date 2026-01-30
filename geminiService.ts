
import { GoogleGenAI, Type } from "@google/genai";
import { DomainType, RoleType, BuildingLayout } from "./types";

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeBlueprint = async (imageB64: string, domain: DomainType, manualName: string): Promise<BuildingLayout> => {
  const ai = getAiClient();
  const model = 'gemini-3-flash-preview';
  
  const prompt = `
    You are a professional architectural AI analyst. Analyze this blueprint for a ${domain} named "${manualName}".
    
    PERFORM THE FOLLOWING ANALYSES:
    1. **Blueprint Understanding**: Identify all floors, blocks, and specific rooms. 
       IMPORTANT: You MUST also identify "Path Nodes" such as "Main Entrance", "Hallway Junction A", "Corridor B", "Stairwell 1", and "Elevator Lobby". These are essential for navigation routing.
    2. **Role & Access Inference**: For every area found, determine which roles (Admin, Visitor, Doctor, Patient, Staff, Student) should be restricted. 
       - e.g., 'ICU' restricted for 'Visitor'.
    3. **Building Purpose Prediction**: Predict the block type (e.g., 'Academic Block', 'Medical Center').

    OUTPUT RULES:
    - Coordinates (x, y) must be integers 0-100.
    - Ensure every traversable hallway or junction has a node in the 'rooms' array so the navigator can build a path through them.
    - Return strictly valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: imageB64, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            buildingName: { type: Type.STRING },
            buildingType: { type: Type.STRING },
            predictedBlockType: { type: Type.STRING },
            floors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.NUMBER },
                  blocks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  rooms: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING, description: "Include room names AND path waypoints like 'Corridor 1'" },
                        block: { type: Type.STRING },
                        floor: { type: Type.NUMBER },
                        description: { type: Type.STRING },
                        coordinates: {
                          type: Type.OBJECT,
                          properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }
                        }
                      },
                      required: ["id", "name", "block", "floor", "coordinates"]
                    }
                  }
                },
                required: ["level", "rooms"]
              }
            },
            accessRules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  restrictedRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reason: { type: Type.STRING }
                }
              }
            }
          },
          required: ["buildingName", "buildingType", "floors", "accessRules", "predictedBlockType"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI returned empty content");
    
    const parsed = JSON.parse(text);
    
    if (parsed.floors) {
      parsed.floors = parsed.floors.map((f: any) => ({
        ...f,
        rooms: (f.rooms || []).map((r: any) => ({
          ...r,
          name: r.name || "Unknown Point",
          description: r.description || "",
          block: r.block || "A",
          id: r.id || Math.random().toString(36).substr(2, 9),
          coordinates: r.coordinates || { x: 50, y: 50 }
        }))
      }));
    }

    return parsed as BuildingLayout;
  } catch (error) {
    console.error("Blueprint Analysis Error:", error);
    throw new Error("The AI failed to process this image accurately. Please ensure the blueprint is clear.");
  }
};

export const getNavInstructions = async (
  message: string, 
  layout: BuildingLayout,
  userRole: RoleType
) => {
  const ai = getAiClient();
  const model = 'gemini-3-flash-preview';
  
  const systemInstruction = `
    You are the SmartReceptionist Navigator for ${layout.buildingName}.
    User Role: ${userRole}.
    
    CONTEXT:
    Building Nodes: ${JSON.stringify(layout.floors.flatMap(f => f.rooms.map(r => ({ name: r.name, id: r.id })) )) }
    Access Rules: ${JSON.stringify(layout.accessRules)}
    
    MISSION:
    1. Calculate the topological path from the starting point (usually Entrance) to the destination.
    2. IMPORTANT: The "path" array MUST NOT be a straight line. It MUST include every intermediate hallway, junction, or corridor node identified in the layout to follow the building's architecture.
    3. Check 'accessRules' - if the destination is restricted, block it.
    4. If destination is reached, set 'isReached' to true.
    
    RESPONSE FORMAT (JSON ONLY):
    {
      "text": "Conversational instructions",
      "path": ["Entrance", "Corridor A", "Junction 1", "Destination Room"],
      "instructions": ["Step 1: Go through Entrance", "Step 2: Turn left at Corridor A...", "Step 3: Arrived"],
      "isReached": boolean,
      "isValid": boolean
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: message,
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};
