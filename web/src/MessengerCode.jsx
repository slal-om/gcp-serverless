import { useEffect } from 'react';

const stylesheetUrl = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/themes/df-messenger-default.css';
const scriptUrl = 'https://www.gstatic.com/dialogflow-console/fast/df-messenger/prod/v1/df-messenger.js';

export default function MessengerCode() {
  useEffect(() => {
    if (!document.getElementById('df-messenger-stylesheet')) {
      const stylesheet = document.createElement('link');
      stylesheet.id = 'df-messenger-stylesheet';
      stylesheet.rel = 'stylesheet';
      stylesheet.href = stylesheetUrl;
      document.head.append(stylesheet);
    }

    if (!document.getElementById('df-messenger-script')) {
      const script = document.createElement('script');
      script.id = 'df-messenger-script';
      script.src = scriptUrl;
      script.async = true;
      document.head.append(script);
    }
  }, []);

  return (
    <df-messenger
      location="us-central1"
      project-id="self-training-denver"
      agent-id="39ca57ae-7bb2-451f-bfe5-7f2dd6377181"
      language-code="en"
      max-query-length="-1"
      style={{
        zIndex: 999,
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        '--df-messenger-font-color': '#000',
        '--df-messenger-font-family': 'Google Sans',
        '--df-messenger-chat-background': '#f3f6fc',
        '--df-messenger-message-user-background': '#d3e3fd',
        '--df-messenger-message-bot-background': '#fff',
      }}
    >
      <df-messenger-chat-bubble chat-title="Telecommunications" />
    </df-messenger>
  );
}