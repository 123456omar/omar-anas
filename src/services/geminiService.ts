import { GoogleGenAI } from "@google/genai";
import { WeatherData } from "../types";
import { WEATHER_CODES } from "./weatherService";

export async function getDetailedWeatherInsight(weather: WeatherData, locationName: string, elevation?: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "الذكاء الاصطناعي غير متوفر حالياً لتوقع النصائح.";

  const ai = new GoogleGenAI({ apiKey });
  
  const currentStatus = WEATHER_CODES[weather.current.weatherCode]?.label || "غير معروف";
  const seaStatus = weather.current.waveHeight !== undefined ? `، ارتفاع الأمواج: ${weather.current.waveHeight} متر` : "";
  const soilStatus = weather.current.soilMoisture !== undefined ? `، رطوبة التربة: ${weather.current.soilMoisture} (حيث 0.1 جاف و 0.4 مشبع)` : "";
  const elevationStatus = elevation !== undefined ? `، الارتفاع عن سطح البحر: ${elevation} متر` : "";
  
  const prompt = `أنت خبير طقس وجغرافيا وجيولوجي عربي محترف. بصفتك "سحاب"، قدم تعليقاً ممتعاً وموجزاً (جملتين أو ثلاث) عن الطقس والبيئة الطبيعية في ${locationName}. 
  الطقس: ${currentStatus}، الحرارة: ${weather.current.temp}°C، الرياح: ${weather.current.windSpeed} كم/س${seaStatus}${soilStatus}${elevationStatus}. 
  اجعل الأسلوب جميلاً وودوداً بالعربية، وتحدث عن طبيعة المنطقة (سواء كانت غابات، مناطق خضراء، قرب بحيرة، أو صحراء) بناءً على المعطيات وقدم نصيحة بيئية.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "لا توجد ملاحظات حالية.";
  } catch (error) {
    console.error("Gemini insight error:", error);
    return "استمتع بيومك بغض النظر عن حالة الطقس!";
  }
}

export async function getFishingHotspots(locationName: string, weather: WeatherData): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return ["رادار الأسماك يحتاج إلى اتصال..."];

  const ai = new GoogleGenAI({ apiKey });
  
  const currentStatus = WEATHER_CODES[weather.current.weatherCode]?.label || "غير معروف";
  const waveHeight = weather.current.waveHeight !== undefined ? `${weather.current.waveHeight} متر` : "غير متوفر";

  const prompt = `بصفتك خبير صيد بحري وجي بي أس، اقترح ٣ مواقع تخيلية أو حقيقية مشهورة لصيد الأسماك في منطقة ${locationName} أو بالقرب منها (سواء كانت بحرية، بحيرات، أو أنهار).
  بناءً على الطقس الحالي (${currentStatus}) وارتفاع الموج (${waveHeight})، حدد أنواع الأسماك المتوقع تواجدها الآن والعمق المناسب.
  أعطني النقاط بشكل مختصر جداً، كل نقطة في سطر جديد.
  مثال: خور دبي، أسماك الهامور، عمق ٥ أمتار.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const text = response.text || "";
    return text.split("\n").filter(line => line.trim().length > 5).slice(0, 3);
  } catch (error) {
    console.error("Gemini fishing error:", error);
    return ["يُنصح بالصيد قرب المناطق الصخرية.", "تتواجد الأسماك بكثرة عند الفجر.", "تأكد من حالة الموج قبل الإبحار."];
  }
}
export async function broadcastObservatoryAlert(eventDetails: string, locationName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "تنبيه عاجل: تم رصد نشاط جوي غير اعتيادي.";

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `أنت المركز العالمي للأرصاد الجوية. حول البلاغ التالي من مستخدم عادي إلى بلاغ رسمي احترافي موجه لجميع المراصد العالمية:
  البلاغ: "${eventDetails}" في منطقة ${locationName}.
  اجعل الصيغة تقنية، رسمية، وموجهة للعلماء والمراصد بأسلوب "تنبيه عالمي عاجل". 
  الحد الأقصى للجملة: جملتان قصيرتان بالعربية وبأسلوب علمي رصين.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "تم إرسال التنبيه إلى الشبكة العالمية للمراصد.";
  } catch (error) {
    console.error("Gemini broadcast error:", error);
    return `تنبيه مرصدي: رصد ظاهرة جوية في ${locationName} - قيد المتابعة.`;
  }
}
export async function getWeatherNews(weather: WeatherData, locationName: string): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return ["سحاب يعمل حالياً على جمع الأخبار..."];

  const ai = new GoogleGenAI({ apiKey });
  
  const dailySummary = weather.daily.weatherCode.map((code, i) => 
    `${weather.daily.time[i]}: ${WEATHER_CODES[code]?.label}`
  ).join(", ");

  const prompt = `أنت مذيع أخبار جوية عالمي. بصفتكم "سحاب"، قوموا بصياغة ٣ عناوين إخبارية عاجلة ومهمة للناس في ${locationName} بناءً على التوقعات التالية: ${dailySummary}.
  ركز على العواصف، الأمطار، أو الحرارة القادمة. اجعل الأسلوب إخباري، رسمي، ومفيد جداً للجمهور. 
  أعطني العناوين فقط، كل عنوان في سطر جديد، بدون أرقام أو رموز.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    const text = response.text || "";
    return text.split("\n").filter(line => line.trim().length > 5).slice(0, 3);
  } catch (error) {
    console.error("Gemini news error:", error);
    return ["تحذير: تقلبات جوية محتملة في الأيام القادمة.", "يُنصح بمتابعة التحديثات الدورية.", "سحاب يتمنى لكم السلامة دائماً."];
  }
}
