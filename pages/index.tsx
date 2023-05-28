import * as React from 'react';
import styles from '../styles/Home.module.css';
import Paper from '@mui/material/Paper'
import InputBase from '@mui/material/InputBase';
import Header from './component/header';
import LoadingButton from '@mui/lab/LoadingButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { parseJson } from '../js/utils';

export default function Home() {
  const [loading, setLoading] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [wh, setWH] = React.useState(0);
  const [chatList, setChatList] = React.useState<{ user: 'self' | 'bot', content: string, timestamp: number, cases?: string[] }[]>([]);

  React.useEffect(() => {
    setWH(window.innerHeight - 330);
  }, []);

  async function handleStartClick() {
    if (question.length > 0) {
      setLoading(true);
      await getUrlData(question);
      setLoading(false);
      setTimeout(scrollChatList);
    }
  }

  function scrollChatList() {
    const div = document.getElementById('chatList');
    if (div) {
      div.scrollTop = div.scrollHeight;
    }
  }

  function getTime(timestamp: number) {
    const d = new Date(timestamp);
    const addZero = (n: number) => String(n).length === 1 ? `0${n}` : `${n}`;
    return `${addZero(d.getFullYear())}-${addZero(d.getMonth() + 1)}-${addZero(d.getDate())} ${addZero(d.getHours())}:${addZero(d.getMinutes())}`;
  }

  async function getUrlData(question: string) {
    setChatList(current => [...current, { user: 'self', content: question, timestamp: Date.now() }]);
    await new Promise<void>(resolve => {
      const evtSource = new EventSource(`/api/question?question=${encodeURIComponent(question)}`);
      setQuestion('');
      setChatList(current => [...current, { user: 'bot', content: '', timestamp: 0, indexs: [] }]);
      evtSource.onmessage = (event) => {
        const data = parseJson(event.data);
        if (!data) {
          return;
        }
        const { content, done, cases, error, message } = data;
        if (error) {
          evtSource.close();
          setChatList(current => {
            const arr = [...current];
            arr[current.length - 1].content += message;
            return arr;
          });
          resolve();
          return;
        }
        if (done) {
          evtSource.close();
          setChatList(current => {
            const arr = [...current];
            arr[current.length - 1].cases = cases;
            arr[current.length - 1].timestamp = Date.now();
            return arr;
          });
          resolve();
          return;
        }
        setChatList(current => {
          const arr = [...current];
          arr[current.length - 1].content += content;
          return arr;
        });
      };
    });
  }

  function handleVidInput(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const newVid = e.target.value;
    setQuestion(newVid);
  }

  return (
    <div className={styles.container}>
      <Header></Header>
      <main>
        <h1>
          Case Assistant
        </h1>
        <Paper
          component="form"
          sx={{ p: '2px 4px', display: 'flex', alignItems: 'left', width: 400, height: 60 }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="请输入问题"
            value={question}
            autoFocus={true}
            onChange={(e) => handleVidInput(e)}
            inputProps={{
              onKeyDown: (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStartClick();
                }
              },
            }}
          />
          <LoadingButton loading={loading} variant="text" onClick={handleStartClick}>确定</LoadingButton>
        </Paper>
        <div style={{ height: wh, width: 500, overflow: 'scroll', scrollBehavior: 'smooth', marginTop: 10 }} id="chatList">
          <List>
            {
              chatList.map((v, i) => <ListItem key={`chat${i}`} style={{ backgroundColor: v.user === 'self' ? 'rgba(25, 118, 210, .2)' : '' }}>
                <ListItemText secondary={v.timestamp > 0 ? <span>{getTime(v.timestamp)}</span> : ''}>{v.content}{v.cases ? <div>	☞ {v.cases.map((v, i) => <a href={`https://pm.igeeker.org/browse/${v}`} className="aTag" key={`cases${i}`} target="_blank">{v}</a>)}</div> : ''}</ListItemText>
              </ListItem>)
            }
          </List>
        </div>
      </main>

      <style jsx>{`
        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        footer {
          width: 100%;
          height: 100px;
          border-top: 1px solid #eaeaea;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        footer img {
          margin-left: 0.5rem;
        }
        footer a {
          display: flex;
          justify-content: center;
          align-items: center;
          text-decoration: none;
          color: inherit;
        }

        #player {
          margin-top: 20px;
        }
        .aTag {
          color: #1976d2;
          margin-right: 20px;
        }
      `}</style>

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}
