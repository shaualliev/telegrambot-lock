const TelegramApi = require("node-telegram-bot-api");
const token = "7238330479:AAFTdGKnyCkqxhOihxNi4nh27JR15EXm_RI";
const bot = new TelegramApi(token, { polling: true });

const {MongoClient} = require('mongodb')
const client = new MongoClient('mongodb+srv://shaualievns:ayau3003@telegrambot.drz3zlo.mongodb.net/?retryWrites=true&w=majority&appName=telegrambot')

let usersCollection;

const start = async () => {
    try {
        await client.connect()
        console.log('Connected to MongoDB')
        const db = client.db('telegrambot')
        usersCollection = db.collection('users')
    } catch (e) {
        console.log(e)
    }
}

start()


bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const username = msg.chat.username;
    const text = msg.text;

    try {
        if (text.startsWith('/start')) {
            const referralId = text.split(' ')[1]; // Получение ID реферала из команды, если он существует
            console.log(`Referral ID: ${referralId}`); // Логирование реферального ID для отладки

            try {

                let user = await usersCollection.findOne({ chatId });
                if (!user) {
                    // Создает свойства для пользователя в базах данных 
                    await usersCollection.insertOne({ 
                        chatId, 
                        username, 
                        count: 0, 
                        lastClick: null, 
                        referralCount: 0,
                        referredBy: referralId || null, 
                        referrals: 0 
                    });
                    // Приветсвтие после команды start 
                    await bot.sendMessage(chatId, `
                        🐳 Приветствую тебя в BTC шлюзе! 🚀 
            
- Получай BTC каждые 12 часов
- Бот НЕ требует вложений
- Вывод осуществляется в течение 24 часов
                    `);

                    // Код для реферальных ссылок
                    if (referralId) {
                        await usersCollection.updateOne(
                            { chatId: parseInt(referralId) },
                            { $inc: { referrals: 1, count: 0.000025, referralCount: 0.000025 } }
                        );

                        await bot.sendMessage(parseInt(referralId), `У вас новый реферал: ${username} (${chatId}). Ваш счет пополнен на 0.000025 BTC.`);
                    }

                } else {
                    // В случае если пользователь уже регистрировался к боту 
                    await bot.sendMessage(chatId, `Добро пожаловать обратно, ${username}!`);
                }
            } catch (err) {
                console.error(err);
                await bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего запроса.');
            }
        }
        // Команда меню 
        else if (msg.text == '/menu') {
            await bot.sendMessage(msg.chat.id, `Меню бота`, {
                reply_markup: {
                    keyboard: [
                        ['👛 Кошелек', '🉑 BitCoin'],
                        ['📙 Информация']
                    ],
                    resize_keyboard: true,
                }
            })
        }
        // Команда информация 
        else if (msg.text == '📙 Информация') {
            await bot.sendMessage(msg.chat.id, `
                📙 Информация

⏳ Работаем: 243 дней
🐳 Участников: 345509
❤️ Новости: <a href="https://t.me/+AtLRIcZH8zpjNTUy">Ссылка</a>
            `, {parse_mode: 'HTML'})
        }
        // Команда BitCoin
        else if (msg.text == '🉑 BitCoin') {
            try {
                const user = await usersCollection.findOne({ chatId });
            
                if (user) {

                    const currentTime = new Date();
                    const twelveHours = 12 * 60 * 60 * 1000; 

                    if (user.lastClick && (currentTime - user.lastClick < twelveHours)) {
                        const remainingTime = twelveHours - (currentTime - user.lastClick);
                        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
                        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));
                        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);

                        await bot.sendMessage(chatId, `
                            ⚠️ Сегодня вы уже получили BTC приходи через ${hours}:${minutes}:${seconds} чтобы получить ещё!
                        `);

                    } else {
                        await usersCollection.updateOne(
                            { chatId },
                            { 
                                $inc: { count: 0.000049 },
                                $set: { lastClick: new Date() }
                            },
                        );

                    await bot.sendMessage(msg.chat.id, `Ваш счет пополнен на ${user.count + 0.000049} BTC`);
                  }
                } else {
                    await bot.sendMessage(msg.chat.id,'Пользователь не найден.');
                }
                } catch (err) {
                    console.error(err);
                    await bot.sendMessage(msg.chat.id, 'Произошла ошибка при обработке вашего запроса.');
                }
        }
        else if (msg.text == '👛 Кошелек') {
            try {
                const user = await usersCollection.findOne({ chatId });
            
                if (user) {
                    const message = await bot.sendMessage(msg.chat.id, `
                        👛 Кошелек
        
🐳 ${username}
🆔 <code>${chatId}</code>

🉑 BTC ${user.count}    
                    `, { 
                        parse_mode: 'HTML', 
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '👥 Рефералы', callback_data: 'show_referrals' }],
                                [{ text: '💸 Вывод', callback_data: 'request_withdrawal' }]
                            ]
                        }
                       })

                       const messageId = message.message_id;
                       console.log('Message ID:', messageId);
                       await usersCollection.updateOne(
                            { chatId },
                            { $set: { walletMessageId: messageId } }
                        );
                } else {
                  await bot.sendMessage('Пользователь не найден.');
                }
              } catch (err) {
                console.error(err);
                await bot.sendMessage('Произошла ошибка при обработке вашего запроса.')
              }
        } else {
            await bot.sendMessage(msg.chat.id, msg.text);
        }
    } 
    catch(error) {
        console.log(error)
    }
})

bot.on('callback_query', async query => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const messageId = query.message.message_id;

    if (data === 'show_referrals') {
        try {
            const user = await usersCollection.findOne({ chatId });

            if (user && user.walletMessageId) {
                await bot.deleteMessage(chatId, user.walletMessageId);
            }
            if (user) {
                const referralLink = `https://t.me/lockbitcoinbot?start=${chatId}`;
                await bot.sendMessage(chatId, `
                    👥 Рефералы

Приглашайте друзей в бот и получайте за каждого 0,000025 BTC

🉑 Заработано ${user.referralCount} BTC
🐳 Приглашено ${user.referrals}
 
🔗 Ссылка: ${referralLink}
                `);
            } else {
                await bot.sendMessage(chatId, 'Пользователь не найден.');
            }
        } catch (err) {
            console.error(err);
            await bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего запроса.');
        }
    } else if (data === 'request_withdrawal') { // Новый обработчик для кнопки "💸 Вывод"
        try {
            const user = await usersCollection.findOne({ chatId });

            if (user && user.walletMessageId) {
                await bot.deleteMessage(chatId, user.walletMessageId);
            }

            const minWithdrawalAmount = 0.00125;
            if (user) {
                const totalBalance = user.count + user.referralCount;
                if (totalBalance < minWithdrawalAmount) {
                    await bot.sendMessage(chatId, `
⚠️ На вашем балансе недостаточно BTC для вывода.

🉑 Минимум к выводу 0,00125 BTC
                    `);
                } else {
                    await bot.sendMessage(chatId, `
💸 Запрос на вывод

Ваш текущий баланс: ${user.count} BTC
Ваш реферальный доход: ${user.referralCount} BTC

Чтобы запросить вывод, введите сумму и адрес кошелька в формате:
<code>/withdraw СУММА АДРЕС</code>
                    `, { parse_mode: 'HTML' });
                }
            } else {
                await bot.sendMessage(chatId, 'Пользователь не найден.');
            }
        } catch (err) {
            console.error(err);
            await bot.sendMessage(chatId, 'Произошла ошибка при обработке вашего запроса.');
        }
    }
});
