const Discord = require('discord.js');
const {prefix} = require('../../config');
let alreadyMentionedUserIds = [];

module.exports = {
    name: 'invite',
    description: 'Invites a user to a Clan',
    guildOnly: true,
    async execute(message, args, clan, member) {
        let isOwnerOfClan = true;
        let isMemberOfClan = true;

        console.log('ARRAY', alreadyMentionedUserIds);

        const authorUserId = message.author.id;
        const authorUsername = (await message.client.fetchUser(message.author.id)).username;
        const authorAvatar = (await message.client.fetchUser(authorUserId)).avatarURL;
        const mentionedUser = message.mentions.members.first();
        const memberClanData = await member.findOne({where: {memberUserId: authorUserId}});
        const memberClan = JSON.parse(JSON.stringify(memberClanData));
        const ownedClanData = await clan.findOne({where: {ownerUserId: authorUserId}, attributes: ['ownerUserId']});
        if (ownedClanData === null) {
            message.channel.send(`You don't own a clan or a not the owner of your clan. Use **${prefix}help** if you want to know how to create a clan.`);
        }
        const ownedClanOwnerId = JSON.parse(JSON.stringify(ownedClanData)).ownerUserId;
        const ownedClanNameData = await clan.findOne({where: {ownerUserId: authorUserId}, attributes: ['name']});
        const ownedClanName = JSON.parse(JSON.stringify(ownedClanNameData));
        const clanRoleIdData = await clan.findOne({where: {ownerUserId: authorUserId}, attributes: ['roleId']});
        const clanRoleId = JSON.parse(JSON.stringify(clanRoleIdData)).roleId;
        const currentMemberCountData = await clan.findOne({where: {ownerUserId: authorUserId}, attributes: ['memberCount']});
        const currentMemberCount = JSON.parse(JSON.stringify(currentMemberCountData)).memberCount;
        const allMemberClanData = await member.findAll({where: {clanName: memberClan.clanName}});
        const allMemberClan = JSON.parse(JSON.stringify(allMemberClanData));

        // Check if user is already in a clan
        if (ownedClanData.length < 1) {
            isOwnerOfClan = false;
        }
        if (memberClan.length < 1) {
            isMemberOfClan = false;
        }

        if (!args.length) {
            return message.channel.send(`Unknown command. Use ${prefix}help to get a list of all commands.`)
        } else if (args.length >= 0 && args.length < 0) {
            return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
        } else if (!isOwnerOfClan) {
            return message.channel.send(`You're not an owner of a clan. **Create** an own clan first and then try it again.`);
        } else if (!mentionedUser) {
            message.channel.send(`Please mention a user in order to invite someone. Use **${prefix}help** if you need help.`);
        } else if (isOwnerOfClan && mentionedUser.id === ownedClanOwnerId) {
            return message.channel.send(`You're the owner of the clan. You can't invite yourself ;)`);
        } else if (isOwnerOfClan) {
            const inviteEmbed = new Discord.RichEmbed()
                .setColor('#0000ff')
                .setTitle('You got invited!')
                .setDescription(`${authorUsername} invited you to join the Clan **${ownedClanName.name}**! React to accept or decline.`)
                .setThumbnail(authorAvatar);

            const acceptEmbed = new Discord.RichEmbed()
                .setColor('#40ff00')
                .setTitle('SUCCESS')
                .setDescription(`You've successfully accepted the invitation and received access to your clan area.`);

            const declineEmbed = new Discord.RichEmbed()
                .setColor('#ff0000')
                .setTitle('SUCCESS')
                .setDescription(`You've successfully declined the invitation and will not receive access to the clan area.`);

            if (mentionedUser.id === memberClan.memberUserId) {
                return message.channel.send(`You can't invite a user that is already in your clan.`);
            } else if (allMemberClan.find(member => member.memberUserId === mentionedUser.id)) {
                return message.channel.send(`You can't invite a user that is already in a clan.`);
            } else if (alreadyMentionedUserIds.find(id => id === mentionedUser.id)) {
                return message.channel.send(`You already invited **${mentionedUser.user.username}**.`);
            } else if (mentionedUser.user.bot) {
                if (mentionedUser.user.username === 'Fanix' && mentionedUser.user.discriminator === '5149') {
                    return message.channel.send(`You can't invite myself ;).`);
                } else {
                    return message.channel.send(`You can't invite a bot.`);
                }
            } else {
                alreadyMentionedUserIds.push(mentionedUser.id);
                mentionedUser.send(inviteEmbed).then(embedMessage => {
                    embedMessage.react('✅').then(() => embedMessage.react('❌'));
                    message.channel.send(`You've successfully invited <@${mentionedUser.id}>. He received a DM where he can **accept** or **decline** your clan invitation.`);

                    const filter = (reaction, user) => {
                        return ['✅', '❌'].includes(reaction.emoji.name) && user.id === mentionedUser.id;
                    };

                    embedMessage.awaitReactions(filter, {max: 1})
                    .then(async collected => {
                        const reaction = collected.first();

                        if (reaction.emoji.name === '✅') {
                            const user = await message.client.fetchUser(mentionedUser.id);
                            console.log('USEROBJECT', user);
                            console.log('BEFORE MEMBERCOUNT', currentMemberCount);
                            await member.create({
                                username: user.username,
                                memberUserId: mentionedUser.id,
                                clanName: ownedClanName.name,
                            });
                            await clan.update(
                                {
                                    memberCount: currentMemberCount + 1
                                },
                                {
                                    where: {name: ownedClanName.name}
                                });
                            const currentMemberCountData1 = await clan.findOne({where: {ownerUserId: authorUserId}, attributes: ['memberCount']});
                            const currentMemberCount1 = await JSON.parse(JSON.stringify(currentMemberCountData1)).memberCount;
                            console.log('AFTER MEMBERCOUNT', currentMemberCount1);
                            await mentionedUser.addRole(clanRoleId);
                            for (let i = 0; i < alreadyMentionedUserIds.length; i++){
                                if ( alreadyMentionedUserIds[i] === mentionedUser.id) {
                                    alreadyMentionedUserIds.splice(i, 1);
                                }
                            }
                            await mentionedUser.send(acceptEmbed);
                        } else {
                            for (let i = 0; i < alreadyMentionedUserIds.length; i++){
                                if ( alreadyMentionedUserIds[i] === mentionedUser.id) {
                                    alreadyMentionedUserIds.splice(i, 1);
                                }
                            }
                            await mentionedUser.send(declineEmbed);
                        }

                    })
                }).catch(() => {
                    for (let i = 0; i < alreadyMentionedUserIds.length; i++){
                        if ( alreadyMentionedUserIds[i] === mentionedUser.id) {
                            alreadyMentionedUserIds.splice(i, 1);
                        }
                    }
                    return message.channel.send("I couldn't invite this user. He has disabled his dm's. ");
                })
            }
        }
    }
};
