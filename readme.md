# 概要
- JSフレームワーク：なし
- CSSフレームワーク：Bluma
- Webpack + Sass

# 開発環境
```
>node --version
v13.12.0

>npm --version
6.14.4
```

このリポジトリをクローンし、リポジトリのルートディレクトリで以下のコマンドを実行
```
npm install
```

# ビルド方法
- package.jsonに定義したnpm scriptを参照

```
# 本番用ビルド(/以下にバンドルファイルを出力)
> npm run build

# 開発用 ファイルに変更がある度に変更箇所に依存する箇所だけ再ビルドする
> npm run build:dev

# 開発用 ローカルサーバーを実行
> start:dev

```

# デプロイ方法

Amazon S3でホストしているので、対象バケットにファイルをアップロード

1. [AWS CLI](https://aws.amazon.com/jp/cli/)をインストール  

2. IAMユーザー作成
    - AWSマネジメントコンソール上から作成
    - RockAndGamesグループに追加

3. 発行されるCredentialを以下のファイルに追記

    - Windowsの場合
        - %USERPROFILE%\.aws\config\
    - Macの場合
        - ~/.aws/config/

credential
```
[RockAndGames]
aws_access_key_id=***********************
aws_secret_access_key=***********************
```

config
```
[RockAndGames]
region=ap-northeast-1
output=json
```

4. package.jsonに定義したnpm scriptを参照  
プロジェクトのルートディレクトリで以下のnpm scriptを実行

```
#AWS CLIで対象のS3バケットにファイルを同期する(publicフォルダ以下をバケット配下に配置)
> npm run deploy
```

# 参考サイト
- [最新版で学ぶwebpack 4入門 JavaScriptのモジュールバンドラ](https://ics.media/entry/12140/)
- [最新版で学ぶwebpack 4入門 スタイルシート(CSS/Sass)を取り込む方法](https://ics.media/entry/17376/)
- [Bluma公式リファレンス](https://bulma.io/documentation/)


# フリー素材の利用
- [問い合わせ・アンケートアイコン](https://icooon-mono.com/?s=question)
    - 改変OKぽいので余白幅だけ変えて利用

# 注意点
- WebpackでCSS,画像ファイルもJSにバンドルしている。
- スマホで2カラムレイアウトにするため、Blumaのタイルの中でColumnsを使い疑似的なタイルを作成している。(ここだけ自前のCSSで作成)