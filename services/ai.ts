import { AIOptions } from '../types';

const USDA_API_KEY = "LucFuL58oA83Lr1aTuhFVYmz1jbZgmvGgTD9I67k";

export class AIService {
    private nanoSession: any | null = null;

    // Инициализация сессии Chrome Built-in AI (Gemini Nano)
    private async createNewSession(onProgress?: (msg: string) => void): Promise<any | null> {
        // Проверяем наличие API (новые и старые версии для совместимости)
        const modelApi = (window as any).ai?.languageModel || (window as any).ai?.assistant;

        if (!modelApi) {
            console.warn("AI Service: Chrome Built-in AI не поддерживается вашим браузером.");
            return null;
        }

        try {
            const capabilities = await modelApi.capabilities();
            if (capabilities.available === 'no') {
                console.warn("AI Service: Модель недоступна.");
                return null;
            }

            // Если модель скачивается, сообщаем об этом
            if (capabilities.available === 'after-download') {
                if (onProgress) onProgress("Загрузка модели ИИ (ждите)...");
            }

            // Создаем сессию с таймаутом 10 секунд
            const sessionPromise = modelApi.create({
                systemPrompt: "Ты - эксперт по питанию и фитнесу. Твоя задача - извлекать данные из текста и отвечать кратко. Всегда старайся возвращать валидный JSON, если тебя просят.",
                temperature: 0.3,
                topK: 3
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("AI_TIMEOUT")), 10000)
            );

            return await Promise.race([sessionPromise, timeoutPromise]);
        } catch (e) {
            console.error("AI Service: Ошибка инициализации:", e);
            return null;
        }
    }

    private async translateToEnglish(text: string): Promise<string> {
        if (!/[а-яА-ЯёЁ]/.test(text)) return text;
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
            const data = await res.json();
            return data?.[0]?.[0]?.[0] || text;
        } catch (e) {
            return text;
        }
    }

    private parseSimple(text: string): { food: string, weight: number } {
        const match = text.match(/(\d+)/);
        const weight = match ? parseInt(match[0]) : 100;
        const food = text.replace(/\d+/g, '').replace(/(г|гр|грамм|grams|g)\.?/g, '').trim();
        return { food, weight };
    }

    private async fetchFromUSDA(foodName: string, weightGrams: number): Promise<any> {
        try {
            const searchRes = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${USDA_API_KEY}`);
            const searchData = await searchRes.json();

            if (!searchData.foods || searchData.foods.length === 0) return { kcal: 0, protein: 0, fat: 0, carbs: 0 };

            const food = searchData.foods[0];
            let kcal = 0, p = 0, f = 0, c = 0;

            food.foodNutrients.forEach((n: any) => {
                const name = n.nutrientName.toLowerCase();
                if (name.includes('energy') && n.unitName.toLowerCase() === 'kcal') kcal = n.value;
                if (name.includes('protein')) p = n.value;
                if (name.includes('total lipid') || name === 'fat') f = n.value;
                if (name.includes('carbohydrate')) c = n.value;
            });

            const mult = weightGrams / 100;
            return {
                kcal: Math.round(kcal * mult),
                protein: parseFloat((p * mult).toFixed(1)),
                fat: parseFloat((f * mult).toFixed(1)),
                carbs: parseFloat((c * mult).toFixed(1))
            };
        } catch (e) {
            return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
        }
    }

    async analyzeFood(foodDescription: string, onProgress?: (msg: string) => void): Promise<any> {
        try {
            if (onProgress) onProgress("Проверка ИИ...");
            this.nanoSession = await this.createNewSession(onProgress);

            let parsed: any = null;

            if (this.nanoSession) {
                if (onProgress) onProgress("AI Анализ...");
                const resultStr = await this.nanoSession.prompt(`Извлеки название продукта и вес в граммах из: "${foodDescription}". Верни JSON: {"food": "name", "weight": 100}`);
                const jsonMatch = resultStr.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                    try { parsed = JSON.parse(jsonMatch[0]); } catch (e) {}
                }
            }

            if (!parsed) {
                if (onProgress) onProgress("Базовый разбор...");
                parsed = this.parseSimple(foodDescription);
            }

            if (onProgress) onProgress("Перевод...");
            parsed.food = await this.translateToEnglish(parsed.food);

            if (onProgress) onProgress(`Поиск: ${parsed.food}...`);
            return await this.fetchFromUSDA(parsed.food, parsed.weight);
        } catch (e) {
            console.error("AI Analysis Error:", e);
            return null;
        } finally {
            if (this.nanoSession?.destroy) {
                this.nanoSession.destroy();
                this.nanoSession = null;
            }
        }
    }

    async generateHistorySummary(historyDataStr: string, onProgress?: (msg: string) => void): Promise<string | null> {
        try {
            if (onProgress) onProgress("Анализ данных...");
            this.nanoSession = await this.createNewSession(onProgress);
            if (!this.nanoSession) return "Локальный ИИ недоступен. Проверьте настройки Chrome.";

            return await this.nanoSession.prompt(`Проанализируй активность и дай 3 совета фитнес-тренера на русском языке: \n${historyDataStr}`);
        } catch (e) {
            return "Ошибка при генерации отчета.";
        } finally {
            if (this.nanoSession?.destroy) this.nanoSession.destroy();
        }
    }

    async parseSportEntry(text: string, onProgress?: (msg: string) => void): Promise<any> {
        try {
            if (onProgress) onProgress("Парсинг...");
            this.nanoSession = await this.createNewSession(onProgress);
            if (!this.nanoSession) return null;

            const prompt = `Разбери текст тренировки. Верни JSON с ключами: "name" (название), "details" (подходы/повторы), "weight" (вес). Текст: "${text}"`;
            const result = await this.nanoSession.prompt(prompt);
            const jsonMatch = result.match(/\{[\s\S]*?\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
            return null;
        } finally {
            if (this.nanoSession?.destroy) this.nanoSession.destroy();
        }
    }
}

export const ai = new AIService();