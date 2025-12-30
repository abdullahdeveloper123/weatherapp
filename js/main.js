   const API_KEY = 'f2a3056cd2e44fa0b6ade9a88dda3d65';
        const API_URL = 'https://api.openweathermap.org/data/2.5';
        const STORAGE_KEY = 'weatherAppSearchHistory';

        // Load search history from localStorage
        function getSearchHistory() {
            const history = localStorage.getItem(STORAGE_KEY);
            return history ? JSON.parse(history) : [];
        }

        // Save search to localStorage
        function saveSearch(city) {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
            history.unshift(city);
            history = history.slice(0, 5);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            renderSearchHistory();
        }

        // Remove search from history
        function removeSearch(city) {
            let history = getSearchHistory();
            history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
            renderSearchHistory();
        }

        // Render search history using map
        function renderSearchHistory() {
            const history = getSearchHistory();
            const historyContainer = document.getElementById('searchHistory');
            const recentSearchesSection = document.getElementById('recentSearches');
            
            if (history.length === 0) {
                recentSearchesSection.classList.add('hidden');
                return;
            }
            
            recentSearchesSection.classList.remove('hidden');
            
            // Use map to create HTML elements dynamically
            historyContainer.innerHTML = history.map(city => `
                <div class="history-item" onclick="searchFromHistory('${city}')">
                    ${city}
                    <span class="remove" onclick="event.stopPropagation(); removeSearch('${city}')">×</span>
                </div>
            `).join('');
        }

        // Search from history
        function searchFromHistory(city) {
            document.getElementById('cityInput').value = city;
            fetchWeatherByCity(city);
        }

        function showError(message) {
            const errorEl = document.getElementById('error');
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(() => errorEl.classList.add('hidden'), 5000);
        }

        function showLoading(show) {
            document.getElementById('loading').classList.toggle('hidden', !show);
        }

        // Async fetch with error handling
        async function searchWeather() {
            const city = document.getElementById('cityInput').value.trim();
            if (!city) {
                showError('Please enter a city name');
                return;
            }
            await fetchWeatherByCity(city);
        }

        async function getCurrentLocation() {
            if (!navigator.geolocation) {
                showError('Geolocation is not supported by your browser');
                return;
            }

            showLoading(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    showLoading(false);
                    let errorMessage = 'Unable to retrieve your location. ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Please enable location permission in your browser.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Location request timed out.';
                            break;
                        default:
                            errorMessage += 'An unknown error occurred.';
                    }
                    showError(errorMessage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }

        // Async fetch with comprehensive error handling
        async function fetchWeatherByCity(city) {
            showLoading(true);
            document.getElementById('weatherData').classList.add('hidden');

            try {
                const response = await fetch(
                    `${API_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
                );

                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('City not found. Please check the spelling and try again.');
                    } else if (response.status === 401) {
                        throw new Error('API key error. Please check your API configuration.');
                    } else {
                        throw new Error(`Error: ${response.status} - Unable to fetch weather data.`);
                    }
                }

                const data = await response.json();
                
                // Save to localStorage
                saveSearch(data.name);
                
                await displayWeather(data);
                await fetchForecast(data.coord.lat, data.coord.lon);
            } catch (error) {
                showError(error.message);
                console.error('Weather fetch error:', error);
            } finally {
                showLoading(false);
            }
        }

        async function fetchWeatherByCoords(lat, lon) {
            try {
                const response = await fetch(
                    `${API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
                );

                if (!response.ok) {
                    throw new Error(`Error ${response.status}: Unable to fetch weather data.`);
                }

                const data = await response.json();
                
                // Save to localStorage
                saveSearch(data.name);
                
                await displayWeather(data);
                await fetchForecast(lat, lon);
            } catch (error) {
                showError(error.message);
                console.error('Weather fetch error:', error);
            } finally {
                showLoading(false);
            }
        }

        async function fetchForecast(lat, lon) {
            try {
                const response = await fetch(
                    `${API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
                );

                if (!response.ok) {
                    throw new Error('Unable to fetch forecast data');
                }

                const data = await response.json();
                displayForecast(data);
            } catch (error) {
                console.error('Forecast fetch error:', error);
                showError('Unable to load forecast data');
            }
        }

        function displayWeather(data) {
            document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
            document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
            document.getElementById('description').textContent = data.weather[0].description;
            document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
            document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
            document.getElementById('humidity').textContent = `${data.main.humidity}%`;
            document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
            document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

            document.getElementById('weatherData').classList.remove('hidden');
        }

        // Use map for dynamic rendering of forecast cards
        function displayForecast(data) {
            const forecastGrid = document.getElementById('forecastGrid');
            
            // Filter to get one forecast per day (every 8th item = 24 hours)
            const dailyData = data.list.filter((item, index) => index % 8 === 0).slice(0, 5);

            // Use map to dynamically render forecast cards
            forecastGrid.innerHTML = dailyData.map(day => {
                const date = new Date(day.dt * 1000);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                return `
                    <div class="forecast-card">
                        <div class="forecast-day">${dayName}</div>
                        <div class="forecast-icon">
                            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="Weather icon" />
                        </div>
                        <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
                        <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px;">${day.weather[0].description}</div>
                    </div>
                `;
            }).join('');
        }

        // Enter key to search
        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchWeather();
            }
        });

        // Initialize app - load search history and default city
        window.addEventListener('load', () => {
            renderSearchHistory();
            fetchWeatherByCity('pakistan');
        });