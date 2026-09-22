/**
 * pm2 的設定：api 與 web 兩個服務常駐、log 進 _dev/mini/logs/。
 *
 *   npm i -g pm2                                  一次
 *   pm2 start _dev/mini/ecosystem.config.cjs      起
 *   pm2 save && pm2 startup                       開機自啟（照它印出的那條 sudo 指令再跑一次）
 *   pm2 restart all                               更新程式後
 *   pm2 logs                                      看 log（api 的例外都在這裡，格式 [時間] ERROR scope — 訊息 | {…}）
 *
 * cwd 用相對路徑，從 repo 根目錄跑 pm2 就對；換機器不用改。
 */
const path = require("node:path");
const root = path.resolve(__dirname, "../..");

module.exports = {
	apps: [
		{
			name: "monstertalk-api",
			cwd: path.join(root, "apps/api"),
			script: "node_modules/.bin/tsx",
			args: "--env-file=../../.env.local src/index.ts",
			interpreter: "none",
			out_file: path.join(root, "_dev/mini/logs/api.log"),
			error_file: path.join(root, "_dev/mini/logs/api.log"),
			time: false,
			autorestart: true,
			max_restarts: 20,
		},
		{
			name: "monstertalk-web",
			cwd: path.join(root, "apps/web"),
			script: "node_modules/.bin/next",
			args: "start --port 6531",
			interpreter: "none",
			out_file: path.join(root, "_dev/mini/logs/web.log"),
			error_file: path.join(root, "_dev/mini/logs/web.log"),
			time: false,
			autorestart: true,
		},
	],
};
