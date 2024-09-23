
# 動作確認
CORSの関係でエラーが出る箇所があるためローカルサーバーを立てて確認が必要

VS Codeを使っている場合
- 拡張[Live Server]をインストール
- index.htmlを右クリック -> [Open with live server]を選択

# デプロイ方法

Amazon S3でホストしているので、対象バケットにファイルをアップロードするだけ

1. (初回のみ)[AWS CLI](https://aws.amazon.com/jp/cli/)をインストール  

2. (初回のみ)IAMユーザー作成
    - AWSマネジメントコンソール上から作成
    - RockAndGamesグループに追加

3. (初回のみ)発行されるCredentialを以下のファイルに追記
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

4. AWSプロファイル[RockAndGames]を指定して以下のコマンドを実行
```
aws s3 sync ./src s3://www.rock-and-games.com/ --delete --profile RockAndGames
```


# その他

活動履歴は編集しやすいようにJSONファイルに外出し
activity.jsonを修正してデプロイするだけでOK

# フリー素材の利用
- [問い合わせ・アンケートアイコン](https://icooon-mono.com/?s=question)
    - 改変OKぽいので余白幅だけ変えて利用
