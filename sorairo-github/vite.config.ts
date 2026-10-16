import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages は https://ユーザー名.github.io/リポジトリ名/ のように、サブフォルダで公開される。
// 公開時は VITE_BASE=/リポジトリ名/ を指定する（自動公開の設定が行う）。通常は '/'。
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [react()] })
