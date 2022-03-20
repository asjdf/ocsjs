import { DefineComponent } from "vue";
import { getItem } from "../common/store";
import { defaultSetting, ScriptSettings } from "../scripts";
import { createSettingPanel, createWorkerSetting } from "../common/create.element";
import { AnswererWrapper, WorkOptions } from "../common/worker/interface";

/**
 * 创建智慧树视频设置面板
 */

export function createZHSVideoSettingPanel(): DefineComponent {
    const settings: ScriptSettings["zhs"]["video"] = getItem("setting.zhs.video", defaultSetting().video);

    return createSettingPanel(
        {
            label: "播放时间(小时)",
            ref: "setting.zhs.video.watchTime",
            type: "number",
            attrs: {
                title: "播放时间到后, 将会自动暂停。\n如设置为0, 则不会自动暂停",
                value: settings.watchTime,
                min: 0,
                max: 24,
                step: 0.5,
            },
        },
        {
            label: "视频倍速",
            ref: "setting.zhs.video.playbackRate",
            type: "number",
            attrs: {
                title: "不能大于1.5倍速,否则容易封号",
                value: settings.playbackRate,
                min: 1.0,
                max: 1.5,
                step: 0.25,
            },
        },
        {
            label: "静音模式",
            ref: "setting.zhs.video.mute",
            type: "checkbox",
            attrs: {
                checked: settings.mute,
            },
        },
        {
            label: "复习模式",
            ref: "setting.zhs.video.restudy",
            type: "checkbox",
            attrs: {
                title: "将播放过的视频再播放一遍。",
                checked: settings.restudy,
            },
        }
    );
}

type WorkSettingOptions = ScriptSettings["zhs"]["work"] &
    Required<Pick<WorkOptions, "period" | "retry" | "timeout" | "stopWhenError">> & {
        answererWrappers: AnswererWrapper[];
    };

/**
 * 创建智慧树 作业/考试 设置面板
 */
export function createZHSWorkSettingPanel() {
    const settings: WorkSettingOptions = getItem("setting.zhs.work", {
        period: 3,
        timeout: 30,
        retry: 1,
        stopWhenError: false,
        answererWrappers: [],
    } as WorkSettingOptions);

    return createSettingPanel(
        /** 作业答题设置 */
        ...createWorkerSetting("作业答题", "setting.zhs.video.upload", {
            upload: settings.upload,
            answererWrappers: getItem("setting.answererWrappers"),
        }),
        {
            label: "答题间隔(秒)",
            ref: "setting.zhs.work.period",
            type: "number",
            attrs: {
                value: settings.period,
                min: 0,
                step: 1,
            },
        },
        {
            label: "搜题请求超时时间(秒)",
            ref: "setting.zhs.work.timeout",
            type: "number",
            attrs: {
                title: "每道题最多做n秒, 超过则跳过此题。",
                value: settings.timeout,
                min: 0,
                step: 1,
            },
        },
        {
            label: "搜题请求重试次数",
            ref: "setting.zhs.work.retry",
            type: "number",
            attrs: {
                value: settings.retry,
                min: 0,
                max: 2,
                step: 1,
            },
        }
    );
}