const chatService = require('../services/chat.service');

async function ask(req, res) {
  res.json(await chatService.askChat(req.user, req.body));
}

module.exports = { ask };
