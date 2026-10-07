import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Btn, Card, Chip, FishPill, Tag } from '../components/ui';
import { copyText, downloadText } from '../components/util';
import { petWeights } from '../domain/summary';
import type { State } from '../domain/types';
import { seed, STATE_VERSION } from '../store/seed';
import { useStore } from '../store/StoreContext';

/** 我的：家庭共养、宠物档案、小鱼干与徽章、提醒设置、数据导入导出 */
export default function MePage() {
  const { state, dispatch, today } = useStore();
  const [name, setName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const invite = `MQW-${state.nickname.length}${state.members.length}${today.replace(/-/g, '').slice(4)}`;
  const csv = () => ['宠物,日期,体重kg', ...state.pets.flatMap((p) => petWeights(state, p.id).map((w) => `${p.name},${w.date},${w.kg}`))].join('\n');
  const missing = (id: string) => { const p = state.pets.find((x) => x.id === id)!; return [!p.birthday, p.neutered === undefined, !p.lifestyle, !p.sex].filter(Boolean).length; };
  return (
    <div className="page">
      <header className="home-head"><h1 className="display grow">我的</h1><FishPill n={state.fish} /></header>
      <Card>
        <label className="field"><span className="label">昵称（家的名字跟着变）</span>
          <input value={state.nickname} onChange={(e) => dispatch({ type: 'nickname/update', name: e.target.value })} /></label>
        <small className="muted">「{state.nickname}的家」· 徽章：{state.badges.length ? state.badges.join('、') : '还没有'}</small>
      </Card>
      <Card>
        <h2 className="h2">家庭共养</h2>
        <small className="muted">每条记录都会显示操作人，谁打过卡一目了然，避免重复喂药。</small>
        <div className="row row--wrap">{state.members.map((m) => <Chip key={m.id} on={state.me === m.id} onClick={() => dispatch({ type: 'member/switch', id: m.id })}>{m.name}{state.me === m.id ? '（当前）' : ''}</Chip>)}</div>
        <div className="row">
          <input aria-label="家人昵称" placeholder="家人昵称" value={name} onChange={(e) => setName(e.target.value)} className="grow" />
          <Btn size="sm" kind="secondary" disabled={!name.trim()} onClick={() => { dispatch({ type: 'member/add', name }); setName(''); }}>添加</Btn>
        </div>
        <Btn size="sm" kind="text" onClick={async () => dispatch({ type: 'toast', text: (await copyText(invite)) ? `邀请码 ${invite} 已复制` : `邀请码：${invite}` })}>复制邀请码</Btn>
      </Card>
      <Card>
        <div className="row"><h2 className="h2 grow">宠物</h2><Btn size="sm" kind="secondary" icon="plus" to="/onboarding">添加</Btn></div>
        {state.pets.map((p) => (
          <Link key={p.id} className="list-row list-row--link" to={`/pet/${p.id}?tab=profile`}>
            <Avatar look={p.look} size={40} /><b className="grow">{p.name}</b>{missing(p.id) ? <Tag tone="amber">档案还差 {missing(p.id)} 项</Tag> : <Tag tone="green">档案完整</Tag>}
          </Link>
        ))}
      </Card>
      <Card>
        <h2 className="h2">提醒</h2>
        <label className="field"><span className="label">每日一问时间（一天只问一次）</span>
          <input type="time" value={state.settings.dailyTime} onChange={(e) => dispatch({ type: 'settings/update', patch: { dailyTime: e.target.value } })} /></label>
        <span className="label">月度护盾提前几天提醒</span>
        <div className="row">{[1, 3, 5, 7].map((n) => <Chip key={n} on={state.settings.leadMonthly === n} onClick={() => dispatch({ type: 'settings/update', patch: { leadMonthly: n } })}>{n} 天</Chip>)}</div>
        <span className="label">年度护盾提前几天提醒</span>
        <div className="row">{[7, 14, 30].map((n) => <Chip key={n} on={state.settings.leadYearly === n} onClick={() => dispatch({ type: 'settings/update', patch: { leadYearly: n } })}>{n} 天</Chip>)}</div>
      </Card>
      <Card>
        <h2 className="h2">数据</h2>
        <small className="muted">数据只存在这台设备上，可以随时导出或迁移。</small>
        <div className="row row--wrap">
          <Btn size="sm" kind="secondary" icon="download" onClick={() => downloadText(`毛球屋-${today}.json`, JSON.stringify({ ...state, toast: undefined }, null, 1))}>导出全部</Btn>
          <Btn size="sm" kind="secondary" icon="download" onClick={() => downloadText(`体重-${today}.csv`, csv(), 'text/csv')}>导出体重表格</Btn>
          <Btn size="sm" kind="secondary" onClick={() => fileRef.current?.click()}>导入</Btn>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            const s = JSON.parse(await f.text()) as State;
            if (s.version !== STATE_VERSION || !Array.isArray(s.pets)) throw new Error('bad');
            dispatch({ type: 'state/replace', state: { ...s, toast: '导入成功' } });
          } catch { dispatch({ type: 'toast', text: '文件格式不对，没有导入' }); }
        }} />
        <Btn size="sm" kind="text" onClick={() => { if (window.confirm('恢复演示数据？当前记录会被覆盖')) dispatch({ type: 'state/replace', state: { ...seed(today), toast: '已恢复演示数据' } }); }}>恢复演示数据</Btn>
      </Card>
    </div>
  );
}
