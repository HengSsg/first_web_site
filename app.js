const weatherBtn = document.getElementById("weatherBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

const locationEl = document.getElementById("location");
const conditionEl = document.getElementById("condition");
const temperatureEl = document.getElementById("temperature");
const foodsEl = document.getElementById("foods");
const reasonEl = document.getElementById("reason");

const weatherCodeMap = {
  0: "맑음",
  1: "대체로 맑음",
  2: "부분적으로 흐림",
  3: "흐림",
  45: "안개",
  48: "짙은 안개",
  51: "이슬비",
  53: "이슬비",
  55: "강한 이슬비",
  61: "비",
  63: "비",
  65: "강한 비",
  71: "눈",
  73: "눈",
  75: "강한 눈",
  80: "소나기",
  81: "소나기",
  82: "강한 소나기",
  95: "뇌우"
};

function recommendFoods(temp, weatherText) {
  const text = weatherText.toLowerCase();

  if (text.includes("비") || text.includes("소나기")) {
    return {
      foods: ["파전", "칼국수", "부대찌개"],
      reason: "비 오는 날에는 따뜻하고 감칠맛 있는 국물/전 메뉴가 잘 어울려요."
    };
  }

  if (text.includes("눈")) {
    return {
      foods: ["어묵탕", "떡국", "훠궈"],
      reason: "눈 오는 날에는 몸을 빠르게 데워주는 뜨끈한 음식이 좋아요."
    };
  }

  if (temp >= 28) {
    return {
      foods: ["냉면", "초계국수", "수박 화채"],
      reason: "더운 날에는 시원하고 수분 보충이 되는 음식이 만족도가 높아요."
    };
  }

  if (temp <= 8) {
    return {
      foods: ["김치찌개", "샤브샤브", "순두부찌개"],
      reason: "추운 날에는 따뜻하고 포만감 있는 메뉴로 체온 유지에 도움이 돼요."
    };
  }

  return {
    foods: ["비빔밥", "돈가스", "샌드위치"],
    reason: "온화한 날씨에는 부담 없는 데일리 메뉴가 좋아요."
  };
}

async function reverseGeocode(lat, lon) {
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ko`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("위치 이름을 불러오지 못했습니다.");

  const data = await res.json();
  if (!data.results || !data.results.length) return "현재 위치";

  const { admin1, name } = data.results[0];
  return admin1 ? `${admin1} ${name}` : name;
}

async function fetchWeatherByLocation(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("날씨 정보를 불러오지 못했습니다.");
  const data = await res.json();

  if (!data.current) throw new Error("유효한 날씨 데이터가 없습니다.");

  return {
    temp: data.current.temperature_2m,
    weatherCode: data.current.weather_code
  };
}

function renderResult({ area, weatherText, temp, foods, reason }) {
  locationEl.textContent = area;
  conditionEl.textContent = weatherText;
  temperatureEl.textContent = `${temp}°C`;

  foodsEl.innerHTML = "";
  foods.forEach((food) => {
    const li = document.createElement("li");
    li.textContent = food;
    foodsEl.appendChild(li);
  });

  reasonEl.textContent = reason;
  resultEl.classList.remove("hidden");
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 기능을 지원하지 않습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000
    });
  });
}

async function runRecommendation() {
  weatherBtn.disabled = true;
  statusEl.textContent = "위치와 날씨를 불러오는 중...";

  try {
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;

    const [area, weatherData] = await Promise.all([
      reverseGeocode(latitude, longitude),
      fetchWeatherByLocation(latitude, longitude)
    ]);

    const weatherText = weatherCodeMap[weatherData.weatherCode] || "기타 날씨";
    const recommendation = recommendFoods(weatherData.temp, weatherText);

    renderResult({
      area,
      weatherText,
      temp: weatherData.temp,
      foods: recommendation.foods,
      reason: recommendation.reason
    });

    statusEl.textContent = "추천이 완료되었습니다!";
  } catch (error) {
    statusEl.textContent = `오류: ${error.message}`;
  } finally {
    weatherBtn.disabled = false;
  }
}

weatherBtn.addEventListener("click", runRecommendation);
