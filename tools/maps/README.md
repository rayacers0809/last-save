# 그림 맵 도구

원화 한 장을 그대로 배경으로 쓰고, 그 위에 24px 충돌 격자를 얹는다.

- `source/<맵>.png` — 원화 (턴이 준 맵 그림)
- `config.py` — 걸을 수 있는 영역(walk), 막힌 물건(block), 바위·덩굴·창살·정류장(special), NPC·노트·표지판 위치.
  좌표는 **가로 1600px로 줄인 미리보기 기준** 픽셀.
- `python3 build.py [맵...]` — `packages/game/src/assets/maps/<맵>.webp`, `packages/game/src/world/mapdata/<맵>.json` 생성.
  `preview/<맵>.jpg`에 막힌 칸(어둡게)·특수 칸(색)·표식이 그려진 확인용 그림이 나온다.
- `python3 check.py` — 출발점에서 모든 NPC·노트·표지판·정류장에 갈 수 있는지 검사 (능력 필요 여부 표시).

맵 그림을 바꾸면 `source/`에 같은 이름으로 넣고 build → check 순서로 돌리면 된다.
