const OWM_API_KEY = '9555d3ff8ce9df3bf735fa24e28fcf8b';
let currentUnit = 'c';
let hourlyChart = null;
let allForecastData = {};

let currentCityTimezoneOffset = 0;
let currentCitySunrise = 0;
let currentCitySunset = 0;

const citySearch = document.getElementById('citySearch');
const currentCondition = document.getElementById('currentCondition');
const currentDetail = document.getElementById('currentDetail');
const locationTag = document.getElementById('locationTag');
const locationElement = document.getElementById('location');
const currentWeatherIcon = document.getElementById('currentWeatherIcon');
const currentTemp = document.getElementById('currentTemp');
const feelsLike = document.getElementById('feelsLike');
const currentDesc = document.getElementById('currentDesc');

const windSpeed = document.getElementById('windSpeed');
const humidity = document.getElementById('humidity');
const visibility = document.getElementById('visibility');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const uvIndex = document.getElementById('uvIndex');
const aqi = document.getElementById('aqi');

const forecastList = document.getElementById('forecastList');
const unitToggle = document.getElementById('unitToggle');
const currentTime = document.getElementById('currentTime');
const currentDate = document.getElementById('currentDate');
const messageText = document.getElementById('messageText');
const adviceText = document.getElementById('adviceText');
const currentWeatherCard = document.getElementById('currentWeatherCard');

const forecastModal = document.getElementById('forecastModal');
const modalTitle = document.getElementById('modalTitle');
const modalHourlyList = document.getElementById('modalHourlyList');

// Define the default city
const DEFAULT_INITIAL_CITY = 'Kolkata'; // New constant for the initial default city

document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 60000);
    // Always load Kolkata's weather on initial page load
    fetchWeather(DEFAULT_INITIAL_CITY);
});

function searchWeather() {
    const city = citySearch.value.trim();
    if (city) {
        fetchWeather(city);
    }
}

// This function will now be called when a "Use My Location" button is clicked
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading("Detecting your location...");
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoordinates(latitude, longitude);
            },
            error => {
                hideLoading();
                showError("Location access denied. Please search manually or try again.");
                console.error("Geolocation error:", error);
            }
        );
    } else {
        showError("Geolocation is not supported by your browser. Please search manually.");
    }
}

function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showError("Voice recognition is not supported in your browser");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    citySearch.placeholder = "Listening...";
    citySearch.value = "";

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        citySearch.value = transcript;
        citySearch.placeholder = "Search city...";
        fetchWeather(transcript);
    };

    recognition.onerror = function(event) {
        citySearch.placeholder = "Search city...";
        showError("Voice recognition failed: " + event.error);
    };
}

async function fetchWeather(cityName) {
    showLoading(`Fetching weather for ${cityName}...`);

    try {
        const units = currentUnit === 'c' ? 'metric' : 'imperial';

        const currentWeatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${OWM_API_KEY}&units=${units}`
        );

        if (!currentWeatherResponse.ok) {
            throw new Error(`HTTP error! status: ${currentWeatherResponse.status} for current weather`);
        }
        const currentWeatherData = await currentWeatherResponse.json();

        const lat = currentWeatherData.coord.lat;
        const lon = currentWeatherData.coord.lon;

        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=${units}`
        );
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status} for forecast`);
        }
        const forecastData = await forecastResponse.json();

        const airPollutionResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`
        );
        let aqiData = null;
        if (airPollutionResponse.ok) {
            aqiData = await airPollutionResponse.json();
        } else {
            console.warn("Could not fetch AQI data.");
        }

        updateDashboard(currentWeatherData, forecastData, aqiData);
        hideLoading();
    } catch (error) {
        console.error("Error fetching weather:", error);
        showError("Could not fetch weather data. Please try another location.");
        hideLoading();
    }
}

async function fetchWeatherByCoordinates(lat, lon) {
    showLoading("Fetching weather data...");

    try {
        const units = currentUnit === 'c' ? 'metric' : 'imperial';

        const currentWeatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=${units}`
        );
        if (!currentWeatherResponse.ok) {
            throw new Error(`HTTP error! status: ${currentWeatherResponse.status} for current weather`);
        }
        const currentWeatherData = await currentWeatherResponse.json();

        const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=${units}`
        );
        if (!forecastResponse.ok) {
            throw new Error(`HTTP error! status: ${forecastResponse.status} for forecast`);
        }
        const forecastData = await forecastResponse.json();

        const airPollutionResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}`
        );
        let aqiData = null;
        if (airPollutionResponse.ok) {
            aqiData = await airPollutionResponse.json();
        } else {
            console.warn("Could not fetch AQI data.");
        }

        updateDashboard(currentWeatherData, forecastData, aqiData);
        hideLoading();
    } catch (error) {
        console.error("Error fetching weather:", error);
        showError("Could not fetch weather data. Please try another location.");
        hideLoading();
    }
}

function updateDashboard(currentWeatherData, forecastData, aqiData) {
    const current = currentWeatherData;
    const city = current.name;
    const country = current.sys.country;

    currentCityTimezoneOffset = current.timezone;
    currentCitySunrise = current.sys.sunrise;
    currentCitySunset = current.sys.sunset;

    locationElement.textContent = `${city}, ${country}`;
    currentWeatherIcon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png`;
    currentWeatherIcon.alt = current.weather[0].description;
    currentTemp.textContent = `${Math.round(current.main.temp)}° ${currentUnit.toUpperCase()}`;
    feelsLike.textContent = `Feels like ${Math.round(current.main.feels_like)}°`;
    currentDesc.textContent = current.weather[0].description;

    currentCondition.textContent = current.weather[0].main;

    humidity.textContent = `${current.main.humidity}%`;
    windSpeed.textContent = `${(current.wind.speed * (currentUnit === 'c' ? 3.6 : 1)).toFixed(1)} ${currentUnit === 'c' ? 'Km/h' : 'mph'}`;
    visibility.textContent = `${(current.visibility / 1000).toFixed(1)} Km`;
    pressure.textContent = `${current.main.pressure} hPa`;

    const sunriseDisplayTime = new Date((current.sys.sunrise + current.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const sunsetDisplayTime = new Date((current.sys.sunset + current.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    sunrise.textContent = sunriseDisplayTime;
    sunset.textContent = sunsetDisplayTime;

    uvIndex.textContent = getUVIndexEstimate(current.weather[0].main, current.main.temp);

    if (aqiData && aqiData.list && aqiData.list.length > 0) {
        const aqiValue = aqiData.list[0].main.aqi;
        aqi.textContent = getAQILabel(aqiValue);
        aqi.style.color = getAQIColor(aqiValue);
    } else {
        aqi.textContent = 'N/A';
        aqi.style.color = getComputedStyle(document.documentElement).getPropertyValue('--light-text');
    }

    locationTag.textContent = `Location: ${city}`;

    updateLocalTime(current.timezone);

    messageText.textContent = getDailyMessage(current.weather[0].main, current.main.temp);
    adviceText.textContent = getClothingAdvice(current.main.temp, current.weather[0].main);

    updateWeatherCardBackground(current.weather[0].main, current.timezone); // Pass timezone for accurate local hour
    
    allForecastData = forecastData.list;

    const now = Math.floor(Date.now() / 1000);
    const hoursToShow = forecastData.list.filter(item => item.dt >= now).slice(0, 8);
    updateHourlyForecast(hoursToShow);

    updateFiveDayForecast(forecastData.list);
}

// Modified to accept timezoneOffset for accurate local time calculation
function updateWeatherCardBackground(condition, timezoneOffsetSeconds) {
    const now = new Date();
    // Calculate local hour for the city based on its timezone offset
    const localHour = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + timezoneOffsetSeconds * 1000).getHours();

    // Define day and night based on fixed hours
    // Day: 6 AM (inclusive) to 6 PM (exclusive, so up to 17:59)
    const isDayTime = (localHour >= 6 && localHour < 18); // 6 AM to 5:59 PM

    const timeSuffix = isDayTime ? '' : '_night';

    condition = condition.toLowerCase();

    const weatherMap = [
        { patterns: ['thundery outbreaks in nearby', 'thunderstorm', 'thunder'], image: 'thunderstorm' },
        { patterns: ['heavy rain', 'torrential rain', 'extreme rain', 'squall'], image: 'heavy_rain' },
        { patterns: ['patchy rain nearby', 'light rain', 'light rain shower', 'drizzle', 'shower', 'rain'], image: 'rain' },
        { patterns: ['partly cloudy', 'broken clouds', 'scattered clouds'], image: 'clouds' },
        { patterns: ['clear', 'sunny'], image: 'clear' },
        { patterns: ['cloud', 'overcast clouds'], image: 'clouds' },
        { patterns: ['fog', 'mist', 'haze', 'smoke', 'dust', 'ash'], image: 'fog' },
        { patterns: ['snow', 'blizzard', 'sleet', 'ice'], image: 'snow' }
    ];

    let imageName = 'default';
    for (const { patterns, image } of weatherMap) {
        if (patterns.some(pattern => condition.includes(pattern))) {
            imageName = image;
            break;
        }
    }

    const tryImage = (path) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = path;
            img.onload = () => resolve(path);
            img.onerror = () => resolve(null);
        });
    };

    const loadBackground = async () => {
        const pathsToTry = [
            `./${imageName}${timeSuffix}.jpg`,
            `./${imageName}.jpg`,
            `./default${timeSuffix}.jpg`,
            `./default.jpg`
        ];

        for (const path of pathsToTry) {
            const validPath = await tryImage(path);
            if (validPath) {
                currentWeatherCard.style.backgroundImage = `url('${validPath}')`;
                currentWeatherCard.className = `current-weather card ${imageName.replace('_', '-')}`;
                return;
            }
        }
        console.error("All image paths failed to load background. Falling back to solid color.");
        currentWeatherCard.style.backgroundImage = 'none';
        currentWeatherCard.style.backgroundColor = 'var(--primary-bg-color)';
    };

    loadBackground();
}

function updateHourlyForecast(hourlyData) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');

    const labels = hourlyData.map(hour => {
        const date = new Date(hour.dt * 1000);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    });
    const temps = hourlyData.map(hour => currentUnit === 'c' ? hour.main.temp : hour.main.temp);
    const precip = hourlyData.map(hour => hour.pop * 100);

    if (hourlyChart) {
        hourlyChart.destroy();
    }

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Temperature (°${currentUnit.toUpperCase()})`,
                    data: temps,
                    borderColor: '#ff00cc',
                    backgroundColor: 'rgba(255, 0, 204, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y',
                    pointBackgroundColor: '#ffffff',
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Precipitation Chance (%)',
                    data: precip,
                    borderColor: '#00f3ff',
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y1',
                    borderDash: [5, 5],
                    pointBackgroundColor: '#ffffff',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'white',
                        font: {
                            family: 'Poppins'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#3498db',
                    borderWidth: 1,
                    displayColors: false,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${Math.round(context.parsed.y)}${context.datasetIndex === 0 ? '°' : '%'}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: `Temperature (°${currentUnit.toUpperCase()})`,
                        color: '#ff00cc'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: 'white',
                        callback: function(value) {
                            return Math.round(value) + '°';
                        }
                    },
                    min: Math.min(...temps) - 2,
                    max: Math.max(...temps) + 2
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Precipitation (%)',
                        color: '#00f3ff'
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: 'white',
                        callback: function(value) {
                            return Math.round(value) + '%';
                        }
                    },
                    min: 0,
                    max: 100
                },
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: 'white'
                    }
                }
            }
        }
    });
}

function updateFiveDayForecast(forecastListRaw) {
    forecastList.innerHTML = '';

    const dailyForecasts = {};

    forecastListRaw.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toISOString().split('T')[0];

        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                temps: [],
                conditions: [],
                date: date,
                fullHourly: []
            };
        }

        dailyForecasts[dateKey].temps.push(item.main.temp);
        dailyForecasts[dateKey].conditions.push(item.weather[0].icon);
        dailyForecasts[dateKey].fullHourly.push(item);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let displayedDays = 0;
    Object.keys(dailyForecasts).sort().forEach((dateKey) => {
        const dateObj = new Date(dateKey);

        if (dateObj < today && dateObj.toDateString() !== today.toDateString()) {
            return;
        }
        if (displayedDays >= 5) {
            return;
        }

        const dayData = dailyForecasts[dateKey];

        const conditionIcon = `https://openweathermap.org/img/wn/${dayData.conditions[0]}@2x.png`;
        const conditionText = dayData.fullHourly[0].weather[0].description;

        const minTemp = Math.min(...dayData.temps);
        const maxTemp = Math.max(...dayData.temps);

        const dayElement = document.createElement('div');
        dayElement.className = `forecast-item ${dateObj.toDateString() === today.toDateString() ? 'today-forecast' : ''}`;
        dayElement.dataset.dateKey = dateKey;
        dayElement.onclick = () => openModal(dateKey, dayData.fullHourly);

        dayElement.innerHTML = `
            <div class="forecast-day">
                ${dateObj.toDateString() === today.toDateString() ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                <div class="forecast-date">${dateObj.getDate()} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
            <div class="forecast-condition">
                <img src="${conditionIcon}" alt="${conditionText}" width="40" height="40">
                <span>${conditionText}</span>
            </div>
            <div class="forecast-temp">
                <span class="high-temp">${Math.round(maxTemp)}°</span>
                <span class="low-temp">${Math.round(minTemp)}°</span>
            </div>
        `;

        forecastList.appendChild(dayElement);
        displayedDays++;
    });
}

function openModal(dateKey, hourlyDataForDay) {
    const dateObj = new Date(dateKey);
    modalTitle.textContent = `Hourly Forecast for ${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric'})}`;
    modalHourlyList.innerHTML = '';

    hourlyDataForDay.forEach(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const temp = Math.round(currentUnit === 'c' ? item.main.temp : item.main.temp_f);
        const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
        const description = item.weather[0].description;

        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'modal-hourly-item';
        hourlyItem.innerHTML = `
            <div class="modal-hourly-time">${time}</div>
            <div class="modal-hourly-condition">
                <img src="${icon}" alt="${description}" width="30" height="30">
                <span>${description}</span>
            </div>
            <div class="modal-hourly-temp">${temp}°</div>
        `;
        modalHourlyList.appendChild(hourlyItem);
    });

    forecastModal.style.display = 'block';
}

function closeModal() {
    forecastModal.style.display = 'none';
}

function updateLocalTime(timezoneOffsetSeconds) {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime + (timezoneOffsetSeconds * 1000));

    const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    currentTime.textContent = localTime.toLocaleTimeString('en-US', options);
    currentDate.textContent = localTime.toLocaleDateString('en-US', dateOptions);
}

function getDailyMessage(condition, temp) {
    const messages = {
        'clear': "Perfect day for outdoor activities! Don't forget sunscreen.",
        'clouds': "Great day for a walk in the park with light layers.",
        'rain': "Carry an umbrella and be careful on wet surfaces.",
        'drizzle': "Carry an umbrella and be careful on wet surfaces.",
        'thunderstorm': "Stay indoors if possible during thunderstorms.",
        'snow': "Watch for icy patches on roads and sidewalks.",
        'mist': "Visibility might be low, drive carefully.",
        'fog': "Visibility might be low, drive carefully.",
        'haze': "Visibility might be low, drive carefully.",
        'default': "Check the hourly forecast for detailed weather changes."
    };

    condition = condition.toLowerCase();
    return messages[condition] || messages.default;
}

function getClothingAdvice(temp, condition) {
    temp = currentUnit === 'c' ? temp : (temp - 32) * 5/9;

    if (temp > 30) {
        return "Wear light, breathable clothing and stay hydrated.";
    } else if (temp > 20) {
        return "Light clothing with a sweater for cooler evenings.";
    } else if (temp > 10) {
        return "Wear layers - jacket or sweater recommended.";
    } else if (temp > 0) {
        return "Bundle up with warm coat, hat, and gloves.";
    } else {
        return "Extreme cold - wear thermal layers and heavy coat.";
    }
}

function getUVIndexEstimate(condition, temp) {
    condition = condition.toLowerCase();
    temp = currentUnit === 'c' ? temp : (temp - 32) * 5/9;

    if (condition.includes('clear') || condition.includes('sun')) {
        if (temp > 25) return "High (8-10)";
        if (temp > 15) return "Moderate (5-7)";
        return "Low (1-4)";
    } else if (condition.includes('cloud') || condition.includes('partly')) {
        if (temp > 20) return "Moderate (4-6)";
        return "Low (1-3)";
    }
    return "Low (0-2)";
}

function getAQILabel(aqiValue) {
    switch(aqiValue) {
        case 1: return "Good";
        case 2: return "Fair";
        case 3: return "Moderate";
        case 4: return "Poor";
        case 5: return "Very Poor";
        default: return "N/A";
    }
}

function getAQIColor(aqiValue) {
    switch(aqiValue) {
        case 1: return "#00e400";
        case 2: return "#ffff00";
        case 3: return "#ff7e00";
        case 4: return "#ff0000";
        case 5: return "#8f3f97";
        default: return "var(--light-text)";
    }
}

function toggleTemperatureUnit() {
    currentUnit = currentUnit === 'c' ? 'f' : 'c';
    unitToggle.textContent = currentUnit === 'c' ? 'Celsius' : 'Fahrenheit';

    const currentCity = locationElement.textContent.split(',')[0].trim();
    if (currentCity && currentCity !== '--') {
        fetchWeather(currentCity);
    } else {
        // If no city is displayed (e.g., initial load after error), fetch Kolkata
        fetchWeather(DEFAULT_INITIAL_CITY);
    }
}

function updateTime() {
    const now = new Date();

    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    currentTime.textContent = `${hours}:${minutes} ${ampm}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDate.textContent = now.toLocaleDateString('en-US', options);
}

function showLoading(message) {
    let loading = document.querySelector('.loading');
    if (!loading) {
        loading = document.createElement('div');
        loading.className = 'loading';
        document.body.appendChild(loading);
    }
    loading.textContent = message;
}

function hideLoading() {
    const loading = document.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
}

function showError(message) {
    let error = document.querySelector('.error-message');
    if (!error) {
        error = document.createElement('div');
        error.className = 'error-message';
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.appendChild(error);
        } else {
            document.body.appendChild(error);
        }
    }
    error.textContent = message;

    setTimeout(() => {
        if (error.parentNode) {
            error.remove();
        }
    }, 5000);
}
