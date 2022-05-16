import { domSearch, sleep, StringUtils } from '../../core/utils';
import { OCSWorker } from '../../core/worker';
import { defaultAnswerWrapperHandler } from '../../core/worker/answer.wrapper.handler';
import { logger } from '../../logger';
import { ScriptSettings } from '../../scripts';

import { store } from '..';
import { message } from '../../components/utils';

export async function workOrExam(setting: ScriptSettings['zhs']['work'], type: 'work' | 'exam' = 'work') {
  const { period, timeout, retry } = setting;

  if (setting.upload === 'close') {
    logger('warn', '自动答题已被关闭！');
    message('warn', '自动答题已被关闭！请在设置开启自动答题！或者忽略此警告');
  } else if (store.setting.answererWrappers.length === 0) {
    logger('warn', '题库配置为空，请设置。');
  } else {
    /** 清空答案 */
    store.workResults = [];

    /** 新建答题器 */
    const worker = new OCSWorker({
      root: '.examPaper_subject',
      elements: {
        title: '.subject_describe,.smallStem_describe',
        options: '.subject_node .nodeLab'
      },
      /** 默认搜题方法构造器 */
      answerer: (elements, type) =>
        defaultAnswerWrapperHandler(store.setting.answererWrappers, type, elements.title[0].innerText),
      work: {
        /** 自定义处理器 */
        handler(type, answer, option) {
          if (type === 'judgement' || type === 'single' || type === 'multiple') {
            if (!option.querySelector('input')?.checked) {
              option.click();
            }
          } else if (type === 'completion' && answer.trim()) {
            const text = option.querySelector('textarea');
            if (text) {
              text.value = answer;
            }
          }
        }
      },
      onResult: (res) => {
        if (res.ctx) {
          store.workResults.push(res);
        }
        console.log(res);
        logger('info', '题目完成结果 : ', res.result?.finish ? '完成' : '未完成');
      },

      /** 其余配置 */

      period: (period || 3) * 1000,
      timeout: (timeout || 30) * 1000,
      retry,
      stopWhenError: false
    });

    const results = await worker.doWork();

    logger('info', '做题完毕', results);

    if (type === 'exam') {
      logger('info', '为了安全考虑，请自行检查后自行点击提交！');
    } else {
      // 处理提交
      await worker.uploadHandler({
        uploadRate: setting.upload,
        results,
        async callback(finishedRate, uploadable) {
          logger('info', '完成率 : ', finishedRate, ' , ', uploadable ? '5秒后将自动提交' : '5秒后将自动保存');

          await sleep(5000);

          // 保存按钮， 提交按钮
          const { saveBtn, uploadBtn } = domSearch({
            saveBtn: '.btnStyleX:not(.btnStyleXSumit)',
            uploadBtn: '.btnStyleXSumit'
          });

          if (uploadable) {
            uploadBtn?.click();
          } else {
            saveBtn?.click();
          }

          await sleep(2000);
          /** 确定按钮 */
          const { confirmBtn } = domSearch({
            confirmBtn: "[role='dialog'] .el-button--primary"
          });

          confirmBtn?.click();
        }
      });
    }
  }
}

/**
 * 学分课的作业
 */
export async function creditWork(setting: ScriptSettings['zhs']['work']) {
  const { period, timeout, retry, stopWhenError } = setting;

  if (setting.upload === 'close') {
    logger('warn', '自动答题已被关闭！');
  } else if (store.setting.answererWrappers.length === 0) {
    logger('warn', '题库配置为空，请设置。');
  } else {
    logger('info', '即将开始做题...');

    const worker = new OCSWorker({
      root: '.questionBox',
      elements: {
        title: '.questionContent',
        options: '.optionUl label',
        questionTit: '.questionTit'
      },
      /** 默认搜题方法构造器 */
      answerer: (elements, type) => {
        const title = StringUtils.nowrap(elements.title[0].innerText)
          .trim();
        if (title) {
          return defaultAnswerWrapperHandler(store.setting.answererWrappers, type, title);
        } else {
          throw new Error('题目为空，请查看题目是否为空，或者忽略此题');
        }
      },
      work: {
        /** 自定义处理器 */
        handler(type, answer, option, ctx) {
          if (type === 'judgement' || type === 'single' || type === 'multiple') {
            if (option.querySelector('input')?.checked === false) {
              option.click();
            }
          } else if (type === 'completion' && answer.trim()) {
            const text = option.querySelector('textarea');
            if (text) {
              text.value = answer;
            }
          }
        }
      },
      onResult: (res) => {
        if (res.ctx) {
          // 浅拷贝并且只保留 innerText ， 防止元素对象变化导致显示的题目全部是一个同样的值。

          if (res.ctx.elements.title[0]) {
            // @ts-ignore
            res.ctx.elements.title[0] = {
              innerText: res.ctx.elements.questionTit[0]?.innerText + res.ctx.elements.title[0]?.innerText
            };
          }

          store.workResults.push(res);
        }
        console.log(res);
        logger('info', '题目完成结果 : ', res.result?.finish ? '完成' : '未完成');
      },
      period: (period || 3) * 1000,
      timeout: (timeout || 30) * 1000,
      retry,
      stopWhenError
    });

    const getBtn = () => document.querySelector('span.Topicswitchingbtn:nth-child(2)') as HTMLElement;
    let next = getBtn();

    while (next) {
      await worker.doWork();
      await sleep((period || 3) * 1000);
      next = getBtn();
      next?.click();
      await sleep((period || 3) * 1000);
    }
  }
}