import { Client, IntentsBitField } from 'discord.js';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

// Conectar ao MongoDB com opções para conectar imediatamente
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  bufferCommands: false, // Desabilita buffer de comandos
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
  console.log('Conectado ao MongoDB');

  // Esquema e modelo para os dados do usuário
  const userSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    points: Number,
  });

  const UserModel = mongoose.model('User', userSchema);

  const client = new Client({
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
    ],
  });

  // IDs dos cargos
  const roles = {
    bronze: '1212936542029488138',
    prata: '1212936542029488138',
    ouro: '1212936542029488138',
    platina: '1212936542029488138',
    diamante: '1212936542029488138',
    mestre: '1212936542029488138',
  };

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    let user = await UserModel.findOne({ userId: message.author.id });
    if (!user) {
      user = new UserModel({
        userId: message.author.id,
        userName: message.author.displayName,
        points: 0,
      });
    }

    if (message.attachments.size > 0) {
      user.points += message.attachments.size;
      await user.save();

      const member = await message.guild.members.fetch(message.author.id);
      await member.roles.remove(Object.values(roles));

      if (user.points >= 501) {
        await member.roles.add(roles.mestre);
      } else if (user.points >= 351) {
        await member.roles.add(roles.diamante);
      } else if (user.points >= 211) {
        await member.roles.add(roles.platina);
      } else if (user.points >= 121) {
        await member.roles.add(roles.ouro);
      } else if (user.points >= 51) {
        await member.roles.add(roles.prata);
      } else {
        await member.roles.add(roles.bronze);
      }
    }

    if (message.content === '!pontos') {
      message.reply(`Você tem ${user.points} pontos.`);
    }

    if (message.content === '!ranking') {
      const users = await UserModel.find().sort({ points: -1 });
      const ranking = users
        .map((u, index) => `${index + 1}. <@${u.userId}> - ${u.points} pontos`)
        .join('\n');
      message.channel.send(`**Ranking de Pontos:**\n${ranking}`);
    }

    if (message.content === '!zerarPontos') {
      if (message.member.permissions.has('ADMINISTRATOR')) {
        try {
          await UserModel.updateMany({}, { $set: { points: 0 } });
          message.channel.send('Todos os pontos foram zerados.');
        } catch (error) {
          console.error('Erro ao zerar os pontos:', error);
          message.channel.send('Ocorreu um erro ao tentar zerar os pontos.');
        }
      } else {
        message.channel.send(
          'Você não tem permissão para executar este comando.',
        );
      }
    }
  });

  client.on('ready', () => {
    console.log(`${client.user.tag} está online!`);
  });

  client.login(process.env.TOKEN);
});
