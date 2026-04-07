# 날씨별 음식 추천 웹사이트

현재 위치의 실시간 날씨(Open-Meteo API)를 받아 음식 메뉴를 추천하는 정적 웹앱입니다.

## 기능
- 브라우저 위치 권한 기반 현재 위치 조회
- 현재 기온/날씨 코드 조회
- 비/눈/더위/추위/온화한 날씨 조건별 음식 추천

## 로컬 실행
정적 파일이라 별도 빌드가 필요 없습니다.

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 배포 (GitHub Pages)
1. GitHub 저장소에 코드 푸시
2. Repository Settings → Pages
3. Source를 `Deploy from a branch`로 선택
4. 브랜치 `main`(또는 배포 브랜치) / `/ (root)` 선택
5. 저장 후 배포 URL 접속

> Netlify/Vercel 같은 정적 호스팅에도 바로 배포 가능합니다.
