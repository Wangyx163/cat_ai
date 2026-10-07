import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import { seed } from '../src/store/seed';
import { StoreProvider } from '../src/store/StoreContext';

const T = '2026-10-08';
function renderAt(path: string) {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><StoreProvider initial={seed(T)} today={T}><App /></StoreProvider></MemoryRouter>);
  return user;
}
const card = (el: HTMLElement) => el.closest('.card') as HTMLElement;

describe('家', () => {
  it('场景、晴雨计提示、每日一问入口和今天的小事', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: '阿柚的家' })).toBeInTheDocument();
    for (const n of ['橘子', '芝麻', '豆包']) expect(screen.getByRole('img', { name: n })).toBeInTheDocument();
    expect(screen.getByText('芝麻今天有点不舒服')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '芝麻有点不舒服' })).toHaveAttribute('href', '/check/p_zhima');
    expect(screen.getByText('今天的每日一问')).toBeInTheDocument();
    expect(screen.getByText('豆包 · 体外驱虫')).toBeInTheDocument();
    expect(screen.getByText('今天该称啦')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '体重秤：去称重' })).toBeInTheDocument();
  });

  it('每日一问：一键都挺好，只给芝麻记例外，提交后 +1 且入口消失', async () => {
    const user = renderAt('/');
    await user.click(screen.getByText('今天的每日一问'));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: '一键：大家都挺好' }));
    const row = within(dialog).getByText('芝麻', { selector: '.daily-row b' }).closest('.daily-row') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: '有点不对' }));
    expect(within(dialog).getByRole('button', { name: '记好了' })).toBeDisabled();
    await user.click(within(row).getByRole('button', { name: '少吃' }));
    expect(within(row).getByText('小雨')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '记好了' }));
    expect(screen.getByRole('status')).toHaveTextContent('谢谢告诉我，小鱼干 +1');
    expect(screen.getByLabelText('小鱼干 129')).toBeInTheDocument();
    expect(screen.queryByText('今天的每日一问')).not.toBeInTheDocument();
  });
});

describe('养护', () => {
  it('护盾打卡：选实际日期确认，按时 +10，护盾回到安全', async () => {
    const user = renderAt('/care?pet=p_doubao');
    expect(screen.getByText('还剩 2 天')).toBeInTheDocument();
    expect(screen.getByText('连续按时称重 5 次')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '打卡' }));
    const dialog = screen.getByRole('dialog', { name: '豆包 · 体外驱虫' });
    expect(within(dialog).getByText(/按时完成 \+10/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '确认已完成' }));
    expect(screen.getByRole('status')).toHaveTextContent('按时完成，小鱼干 +10');
    expect(screen.queryByText('还剩 2 天')).not.toBeInTheDocument();
  });

  it('称重小游戏：抱着称自动相减并写入', async () => {
    const user = renderAt('/care?pet=p_doubao&weigh=1');
    const dialog = screen.getByRole('dialog', { name: '给豆包称体重' });
    await user.click(within(dialog).getByRole('button', { name: '抱着称' }));
    await user.type(within(dialog).getByLabelText('抱着一起称'), '66.3');
    await user.type(within(dialog).getByLabelText('只称自己'), '54.5');
    expect(within(dialog).getByText('11.8 kg')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '记下这次体重' }));
    expect(screen.getByRole('status')).toHaveTextContent('记好了');
  });

  it('计划模板：沿用已有记录、加一项剪指甲，生成后回到养护', async () => {
    const user = renderAt('/plan/p_zhima');
    await user.click(screen.getByRole('button', { name: '下一步：选项目' }));
    await user.click(screen.getByRole('button', { name: /剪指甲/ }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getAllByRole('button', { name: /沿用记录/ }).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '预览' }));
    await user.click(screen.getByRole('button', { name: '生成计划' }));
    expect(screen.getByRole('status')).toHaveTextContent('已生成 7 项计划');
    expect(screen.getByRole('heading', { name: '芝麻的护盾' })).toBeInTheDocument();
  });
});

describe('状态检测', () => {
  it('勾选红旗直接建议就医，并生成摘要', async () => {
    const user = renderAt('/check/p_zhima');
    await user.click(screen.getByLabelText('频繁蹲砂盆却尿不出'));
    expect(screen.queryByRole('button', { name: '都没有，继续' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '有，马上联系医院' }));
    expect(screen.getAllByText('建议尽快就医').length).toBeGreaterThan(0);
    expect(screen.getByText('紧急情况')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /查找附近 24 小时宠物医院/ })).toBeInTheDocument();
  });

  it('点身体图 → 分级 → 摘要 → 回填用药，回到家出现喂药提醒', async () => {
    const user = renderAt('/check/p_zhima');
    await user.click(screen.getByRole('button', { name: '都没有，继续' }));
    const next = screen.getByRole('button', { name: '下一步' });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '肚子' }));
    await user.click(screen.getByRole('button', { name: '少吃' }));
    await user.click(screen.getByRole('button', { name: '便便偏软' }));
    await user.click(screen.getByRole('button', { name: '2–3 天' }));
    await user.click(next);
    expect(screen.getByText('建议预约就诊')).toBeInTheDocument();
    expect(screen.getByText('近 4 周 4.4 → 4.1 kg')).toBeInTheDocument();
    expect(screen.getByText('4 天少吃 · 2 天便便偏软')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '看完医生了？回填诊断、用药与复诊' }));
    await user.type(screen.getByLabelText('药名 1'), '益生菌');
    await user.click(screen.getByRole('button', { name: '保存并生成提醒' }));
    expect(screen.getByRole('heading', { name: '阿柚的家' })).toBeInTheDocument();
    expect(screen.getByText('芝麻 · 益生菌 · 每天 2 次')).toBeInTheDocument();
  });
});

describe('成长与分享', () => {
  it('到家 365 天里程碑生成分享卡片', async () => {
    const user = renderAt('/pet/p_juzi?tab=grow');
    expect(screen.getByText('到家 365 天啦')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '生成分享卡片' }));
    const dialog = screen.getByRole('dialog', { name: '分享卡片预览' });
    expect(within(dialog).getByText('橘子到家 365 天')).toBeInTheDocument();
    for (const v of ['4.6 kg', '12 次', '318 天']) expect(within(dialog).getByText(v)).toBeInTheDocument();
    expect(within(dialog).getByText('已自动隐藏芯片号与精确位置')).toBeInTheDocument();
  });
});

describe('圈子', () => {
  it('约遛：跳过不回应的、和可乐匹配、邀约、见面打卡、评价成为宠友', async () => {
    const user = renderAt('/circle/walk');
    expect(screen.getByRole('heading', { name: '馒头' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '嗅一嗅' }));
    expect(screen.getByRole('status')).toHaveTextContent('已嗅一嗅，等馒头回应');
    expect(screen.getByRole('heading', { name: '可乐' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '嗅一嗅' }));
    const dialog = screen.getByRole('dialog', { name: '和可乐匹配成功' });
    await user.click(within(dialog).getByRole('button', { name: '发出邀约' }));
    const appt = card(screen.getByText(/和可乐（可乐妈）/));
    await user.click(within(appt).getByRole('button', { name: '见面打卡' }));
    await user.click(within(appt).getByRole('button', { name: '超合拍' }));
    expect(within(appt).getByText('已成为宠友')).toBeInTheDocument();
    expect(screen.getByText('附近暂时没有合适的狗狗')).toBeInTheDocument();
  });

  it('走失互助：我看到了 → 线索发给失主 +5', async () => {
    const user = renderAt('/circle');
    await user.click(screen.getByRole('button', { name: '我看到了' }));
    const dialog = screen.getByRole('dialog', { name: '看到年糕了？' });
    await user.type(within(dialog).getByLabelText('在哪、什么情况'), '3 号楼地库入口');
    await user.click(within(dialog).getByRole('button', { name: '把线索发给失主' }));
    expect(screen.getByRole('status')).toHaveTextContent('线索已发给失主，小鱼干 +5');
  });

  it('带档案提问：发布到同好圈', async () => {
    const user = renderAt('/circle?compose=1');
    const dialog = screen.getByRole('dialog', { name: '带档案提问' });
    await user.type(within(dialog).getByLabelText('想问什么'), '换粮软便怎么过渡？');
    await user.click(within(dialog).getByRole('button', { name: '发布' }));
    await user.click(screen.getByRole('tab', { name: /同好/ }));
    expect(screen.getByText('换粮软便怎么过渡？')).toBeInTheDocument();
  });
});

describe('建档', () => {
  it('3 步入住：物种 → 名字 → 形象', async () => {
    const user = renderAt('/onboarding');
    await user.click(screen.getByRole('button', { name: '狗' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.type(screen.getByLabelText('名字（唯一需要打字的地方）'), '年糕');
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getAllByRole('button', { name: '柴犬' })[0]);
    await user.click(screen.getByRole('button', { name: '入住「家」' }));
    expect(screen.getByRole('status')).toHaveTextContent('年糕入住啦');
    expect(screen.getByText('4 只毛孩子', { exact: false })).toBeInTheDocument();
  });
});
