const { ImapFlow } = require('imapflow');

const client = new ImapFlow({
  host: 'imap.mail.ru', port: 993, secure: true,
  auth: { user: 'info@gastroprime.ru', pass: 'UdpJKl74eMAi3cn62gqN' },
  logger: false
});

(async () => {
  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      let ids = await client.search({ unseen: true });
      if (ids && ids.length > 0) {
        console.log('Новых писем: ' + ids.length);
        for await (let msg of client.fetch(ids.join(','), { envelope: true })) {
          const from = msg.envelope.from[0]?.address || '?';
          const subj = msg.envelope.subject || '(без темы)';
          console.log('  📧 От: ' + from + ' | Тема: ' + subj);
        }
      } else {
        console.log('Новых непрочитанных писем нет');
      }
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (e) {
    console.error('Ошибка проверки почты: ' + e.message);
  }
})();
