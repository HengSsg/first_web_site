"use strict";

// 4팀 풀리그(round-robin): 총 6경기
// 팀 인덱스 0,1,2,3 / 경기는 (i,j) 쌍, i<j
const PAIRS = [
  [0, 1], [0, 2], [0, 3],
  [1, 2], [1, 3], [2, 3],
];

// 미정 경기를 채울 수 있는 결과들: 'home'(앞 팀 승), 'draw'(무), 'away'(뒤 팀 승)
const OUTCOMES = ["home", "draw", "away"];

// 기본 예시: 2022 카타르 월드컵 H조
const DEFAULT_TEAMS = ["대한민국", "우루과이", "가나", "포르투갈"];

// 상태
const state = {
  teams: [...DEFAULT_TEAMS],
  // pairKey("0-1") -> 'home' | 'draw' | 'away' | 'none'(미정)
  results: {},
};

const pairKey = (i, j) => `${i}-${j}`;
PAIRS.forEach(([i, j]) => { state.results[pairKey(i, j)] = "none"; });

// ---------- 렌더링 ----------
function renderTeams() {
  const wrap = document.getElementById("teams");
  wrap.innerHTML = "";
  state.teams.forEach((name, idx) => {
    const field = document.createElement("div");
    field.className = "team-field";
    field.innerHTML = `
      <label for="team${idx}">팀 ${idx + 1}</label>
      <input id="team${idx}" type="text" value="${escapeAttr(name)}" maxlength="20" />
    `;
    field.querySelector("input").addEventListener("input", (e) => {
      state.teams[idx] = e.target.value;
      renderMatches();
    });
    wrap.appendChild(field);
  });
}

function teamName(idx) {
  const n = (state.teams[idx] || "").trim();
  return n || `팀 ${idx + 1}`;
}

function renderMatches() {
  const wrap = document.getElementById("matches");
  wrap.innerHTML = "";
  PAIRS.forEach(([i, j]) => {
    const key = pairKey(i, j);
    const row = document.createElement("div");
    row.className = "match-row";
    row.innerHTML = `
      <span class="match-label">${escapeHtml(teamName(i))} <small>vs</small> ${escapeHtml(teamName(j))}</span>
      <select data-key="${key}">
        <option value="none">미정</option>
        <option value="home">${escapeHtml(teamName(i))} 승</option>
        <option value="draw">무승부</option>
        <option value="away">${escapeHtml(teamName(j))} 승</option>
      </select>
    `;
    const sel = row.querySelector("select");
    sel.value = state.results[key];
    sel.addEventListener("change", (e) => {
      state.results[key] = e.target.value;
    });
    wrap.appendChild(row);
  });
}

// ---------- 경우의 수 계산 ----------
function pointsFromOutcome(outcome) {
  // 반환: [앞팀 승점, 뒤팀 승점]
  if (outcome === "home") return [3, 0];
  if (outcome === "away") return [0, 3];
  return [1, 1]; // draw
}

// 주어진 전체 결과(map: pairKey -> outcome)로 각 팀의 승점 계산
function computePoints(resultMap) {
  const pts = [0, 0, 0, 0];
  PAIRS.forEach(([i, j]) => {
    const [pi, pj] = pointsFromOutcome(resultMap[pairKey(i, j)]);
    pts[i] += pi;
    pts[j] += pj;
  });
  return pts;
}

// 동점 그룹 내 승자승(상대전적) 승점
function headToHeadPoints(group, resultMap) {
  const h2h = {};
  group.forEach((t) => { h2h[t] = 0; });
  for (let a = 0; a < group.length; a++) {
    for (let b = a + 1; b < group.length; b++) {
      const i = Math.min(group[a], group[b]);
      const j = Math.max(group[a], group[b]);
      const [pi, pj] = pointsFromOutcome(resultMap[pairKey(i, j)]);
      h2h[i] += pi;
      h2h[j] += pj;
    }
  }
  return h2h;
}

// 한 시나리오의 순위 티어 계산. 반환: [[티어0 팀들], [티어1 팀들], ...] (상위 → 하위)
// 같은 티어 = 승점·승자승까지 동일 (경합)
function rankTiers(resultMap) {
  const pts = computePoints(resultMap);
  const teams = [0, 1, 2, 3];

  // 1차: 승점으로 그룹화
  const byPoints = {};
  teams.forEach((t) => {
    (byPoints[pts[t]] = byPoints[pts[t]] || []).push(t);
  });
  const pointKeys = Object.keys(byPoints).map(Number).sort((a, b) => b - a);

  const tiers = [];
  pointKeys.forEach((p) => {
    const group = byPoints[p];
    if (group.length === 1) {
      tiers.push(group);
      return;
    }
    // 2차: 승자승으로 세분화
    const h2h = headToHeadPoints(group, resultMap);
    const byH2H = {};
    group.forEach((t) => {
      (byH2H[h2h[t]] = byH2H[h2h[t]] || []).push(t);
    });
    Object.keys(byH2H).map(Number).sort((a, b) => b - a).forEach((h) => {
      tiers.push(byH2H[h]); // 같은 티어 = 경합
    });
  });

  return { tiers, pts };
}

// 티어로부터 각 팀 상태 산출: 'advance'(확정 진출) | 'maybe'(경합) | 'out'
function classify(tiers) {
  const status = [null, null, null, null];
  let filled = 0;
  tiers.forEach((tier) => {
    const size = tier.length;
    if (filled + size <= 2) {
      tier.forEach((t) => (status[t] = "advance"));
      filled += size;
    } else if (filled >= 2) {
      tier.forEach((t) => (status[t] = "out"));
      filled += size;
    } else {
      // 경계선에 걸친 티어: 자리는 일부만 → 경합
      tier.forEach((t) => (status[t] = "maybe"));
      filled += size;
    }
  });
  return status;
}

function calculate() {
  const resultMap = { ...state.results };
  const undecided = PAIRS.map(([i, j]) => pairKey(i, j)).filter(
    (k) => resultMap[k] === "none"
  );

  const totalScenarios = Math.pow(3, undecided.length);
  const agg = [0, 1, 2, 3].map(() => ({ advance: 0, maybe: 0, out: 0 }));

  // 미정 경기들의 모든 조합 열거 (3^k)
  for (let combo = 0; combo < totalScenarios; combo++) {
    let n = combo;
    undecided.forEach((k) => {
      resultMap[k] = OUTCOMES[n % 3];
      n = Math.floor(n / 3);
    });
    const { tiers } = rankTiers(resultMap);
    const status = classify(tiers);
    status.forEach((s, t) => { agg[t][s]++; });
  }

  const currentPts = computePoints(state.results);
  return { agg, totalScenarios, undecidedCount: undecided.length, currentPts };
}

// ---------- 결과 표시 ----------
function showResult() {
  const { agg, totalScenarios, undecidedCount, currentPts } = calculate();

  const tbody = document.querySelector("#resultTable tbody");
  tbody.innerHTML = "";

  [0, 1, 2, 3].forEach((t) => {
    const a = agg[t];
    const possible = a.advance + a.maybe;
    let verdict, cls;
    if (a.advance === totalScenarios) {
      verdict = "진출 확정"; cls = "qualified";
    } else if (possible === 0) {
      verdict = "탈락 확정"; cls = "eliminated";
    } else {
      verdict = "경합 중"; cls = "contest";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="team-name">${escapeHtml(teamName(t))}</td>
      <td>${currentPts[t]}점</td>
      <td>${a.advance} / ${totalScenarios}</td>
      <td>${possible} / ${totalScenarios}</td>
      <td>${a.out} / ${totalScenarios}</td>
      <td><span class="badge ${cls}">${verdict}</span></td>
    `;
    tbody.appendChild(tr);
  });

  const summary = document.getElementById("summary");
  if (undecidedCount === 0) {
    summary.textContent = "남은 경기가 없습니다. 최종 순위 기준 상위 2팀이 16강에 진출합니다.";
  } else {
    summary.textContent =
      `남은 경기 ${undecidedCount}개 → 총 ${totalScenarios}가지 경우의 수를 시뮬레이션했습니다. ` +
      `'진출 확정'은 모든 경우에서, '진출 가능'은 일부 경우에서 16강에 오르는 횟수입니다.`;
  }

  document.getElementById("result").classList.remove("hidden");
  document.getElementById("status").textContent = "계산 완료! 아래 결과를 확인하세요.";
  document.getElementById("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- 유틸 ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

function reset() {
  state.teams = [...DEFAULT_TEAMS];
  PAIRS.forEach(([i, j]) => { state.results[pairKey(i, j)] = "none"; });
  renderTeams();
  renderMatches();
  document.getElementById("result").classList.add("hidden");
  document.getElementById("status").textContent = "초기화되었습니다. 다시 입력해보세요.";
}

// ---------- 초기화 ----------
document.getElementById("calcBtn").addEventListener("click", showResult);
document.getElementById("resetBtn").addEventListener("click", reset);
renderTeams();
renderMatches();
