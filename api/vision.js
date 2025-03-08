import OpenAI from 'openai';
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 定義食物分析結果的結構
const FoodAnalysis = z.object({
  name: z.string().describe("食物名稱"),
  calories: z.number().describe("熱量(大卡)"),
  carbs: z.number().describe("碳水化合物(克)"),
  fat: z.number().describe("脂肪(克)"),
  protein: z.number().describe("蛋白質(克)")
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "你是一個專業的營養分析師，負責分析食物圖片並提供營養成分資訊。"
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "分析這張食物圖片，並以 json 格式返回結果：\n" +
                    "食物名稱：[名稱]\n" +
                    "熱量：[數值] 大卡\n" +
                    "碳水化合物：[數值] 克\n" +
                    "脂肪：[數值] 克\n" +
                    "蛋白質：[數值] 克" 
            },
            {
              type: "image_url",
              image_url: {
                url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
              }
            }
          ]
        }
      ],
      response_format: zodResponseFormat(FoodAnalysis, "food_analysis"),
      max_tokens: 1000,
    });

    const result = completion.choices[0].message.parsed;
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}