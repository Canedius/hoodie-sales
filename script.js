import { salesData } from './sales-data.js';

let salesChart, dailyDemandChart;
// Define preferred size order for consistent display
const sizeOrder = ['XS', 'XS/S', 'S', 'M', 'M/L', 'L', 'XL', 'XL/XXL', '2XL', 'XXL', '3XL'];
// Function to assign colors
function getColor(name) {
    const colorMap = {
        'Чорний': '#000000',
        'Білий': '#E0E0E0',
        'Ніжно-рожевий': '#FFC1CC',
        'Бежевий': '#F5F5DC',
        'Олива': '#808000',
        'Сірий Грі': '#808080',
        'Сірий': '#808080',
        'Хакі': '#C3B091',
        'Койот': '#8B6F47',
        'Інший Колір': '#FF00FF',
        'XS': '#FF6347',
        'S': '#4682B4',
        'M': '#32CD32',
        'L': '#FFD700',
        'XL': '#6A5ACD',
        'XXL': '#FF4500',
        '3XL': '#9ACD32',
        'M/L': '#20B2AA',
        'XL/XXL': '#DA70D6',
        'XS/S': '#FF8C00'
    };
    return colorMap[name] || '#000000';
}
// Function to extract and sort sizes for a product
function getProductSizes(productData) {
    const sizeSet = new Set();
    productData.months.forEach(month => {
        Object.values(month.colors).forEach(colorData => {
            colorData.forEach(item => sizeSet.add(item.size));
        });
    });
    const sizes = Array.from(sizeSet);
    return sizes.sort((a, b) => {
        const indexA = sizeOrder.indexOf(a);
        const indexB = sizeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) {
            return a.localeCompare(b, 'uk');
        }
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
}
// Function to calculate total sales for a dataset
function calculateTotalSales(data) {
    return data.reduce((sum, value) => sum + value, 0);
}
// Helper to get month index (0-based)
function getMonthIndex(monthName) {
    const monthMap = {
        'Січень': 0, 'Лютий': 1, 'Березень': 2, 'Квітень': 3, 'Травень': 4, 'Червень': 5,
        'Липень': 6, 'Серпень': 7, 'Вересень': 8, 'Жовтень': 9, 'Листопад': 10, 'Грудень': 11
    };
    return monthMap[monthName] || 0;
}
// Function to get days in a month
function getDaysInMonth(month, year) {
    return new Date(year, getMonthIndex(month) + 1, 0).getDate();
}

function getSelectedYear() {
    const yearElement = document.getElementById('yearSelect');
    if (!yearElement) {
        return null;
    }
    const yearValue = parseInt(yearElement.value, 10);
    return Number.isNaN(yearValue) ? null : yearValue;
}
// Function to update total sales display
function updateTotalSales(datasets) {
    const totalSalesDiv = document.getElementById('totalSales');
    let html = '<h3>Загальні суми продажів:</h3><ul>';
    datasets.forEach(dataset => {
        const total = calculateTotalSales(dataset.data);
        const label = dataset.label.split(' (Щоденний)')[0];
        const color = getColor(label);
        html += `<li><span class="label"><span class="color-square" style="background-color: ${color};"></span>${label}</span><span class="value">${total}</span></li>`;
    });
    html += '</ul>';
    totalSalesDiv.innerHTML = html;
}
// Function to update weekly demand text display
function updateWeeklyDemand(productData) {
    const weeklyDemandList = document.getElementById('weeklyDemandList');
    const yearSelect = document.getElementById('yearSelect').value;
    const monthSelect = document.getElementById('monthSelect').value;
    const colorSelect = document.getElementById('colorSelect').value;
    let html = '';
    const month = productData.months.find(m => m.year === parseInt(yearSelect) && m.month === monthSelect);
    if (!month || !month.colors[colorSelect]) {
        html = '<p>Немає даних для вибраного року, місяця або кольору</p>';
        weeklyDemandList.innerHTML = html;
        return;
    }
    const colorHex = getColor(colorSelect);
    const productSizes = getProductSizes(productData);
    const daysInMonth = getDaysInMonth(month.month, month.year);
    const weeksInMonth = daysInMonth / 7;
    let totalWeekly = 0; // Для пункту "Усього"
    html += `<h4><span class="color-square" style="background-color: ${colorHex};"></span>${colorSelect}</h4>`;
    html += '<ul class="fade-in">';
    productSizes.forEach(size => {
        const colorData = month.colors[colorSelect];
        const item = colorData ? colorData.find(i => i.size === size) : null;
        const total = item ? item.quantity : 0;
        const weekly = Math.round(total / weeksInMonth * 10) / 10;
        if (weekly > 0) {
            html += `<li class="fade-in"><span class="label">${size}</span><span class="value">${weekly}</span></li>`;
            totalWeekly += weekly;
        }
    });
    totalWeekly = Math.round(totalWeekly * 10) / 10; // Округлення до 1 знака
    html += `<li class="fade-in"><span class="label">Усього</span><span class="value">${totalWeekly}</span></li>`;
    html += '</ul>';
    weeklyDemandList.innerHTML = html;
    // Remove fade-in class after animation completes
    setTimeout(() => {
        const ul = weeklyDemandList.querySelector('ul');
        if (ul) ul.classList.remove('fade-in');
        const lis = weeklyDemandList.querySelectorAll('li');
        lis.forEach(li => li.classList.remove('fade-in'));
    }, 500); // Matches animation duration
}
// Function to calculate daily demand data
function calculateDailyDemandData(productData, months, chartType) {
    const datasets = [];
    const productSizes = getProductSizes(productData);
    if (chartType === 'byColor') {
        const colors = getProductColors(productData, months);
        colors.forEach(color => {
            const data = months.map(month => {
                const daysInMonth = getDaysInMonth(month.month, month.year);
                const total = month.colors[color] ? month.colors[color].reduce((sum, item) => sum + item.quantity, 0) : 0;
                return Math.round(total / daysInMonth * 10) / 10;
            });
            datasets.push({
                label: color,
                data: data,
                backgroundColor: getColor(color),
                borderColor: getColor(color),
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 0.9
            });
        });
    } else {
        const color = chartType;
        productSizes.forEach(size => {
            const data = months.map(month => {
                const daysInMonth = getDaysInMonth(month.month, month.year);
                const colorData = month.colors[color];
                const item = colorData ? colorData.find(i => i.size === size) : null;
                const total = item ? item.quantity : 0;
                return Math.round(total / daysInMonth * 10) / 10;
            });
            datasets.push({
                label: size,
                data: data,
                backgroundColor: getColor(size),
                borderColor: getColor(size),
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 0.9
            });
        });
    }
    return datasets;
}
// Function to get colors for a product
function getProductColors(productData, monthsSubset = null) {
    const colorSet = new Set();
    const sourceMonths = monthsSubset || productData.months;
    sourceMonths.forEach(month => {
        Object.keys(month.colors).forEach(color => colorSet.add(color));
    });
    return Array.from(colorSet);
}
// Function to update year dropdown
function updateYearSelect(productData) {
    const yearSelect = document.getElementById('yearSelect');
    const previousValue = yearSelect.value;
    yearSelect.innerHTML = '';
    const years = Array.from(new Set(productData.months.map(month => month.year))).sort((a, b) => a - b);
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });
    if (years.length === 0) {
        yearSelect.innerHTML = '<option value="">Немає років</option>';
        return;
    }
    const fallbackYear = String(years[0]);
    const selectedYear = years.map(String).includes(previousValue) ? previousValue : fallbackYear;
    yearSelect.value = selectedYear;
}
// Function to update month dropdown
function updateMonthSelect(productData) {
    const monthSelect = document.getElementById('monthSelect');
    const previousValue = monthSelect.value;
    const yearSelectValue = parseInt(document.getElementById('yearSelect').value, 10);
    monthSelect.innerHTML = '';
    if (Number.isNaN(yearSelectValue)) {
        monthSelect.innerHTML = '<option value="">Немає місяців</option>';
        return;
    }
    const months = Array.from(new Set(
        productData.months
            .filter(month => month.year === yearSelectValue)
            .map(month => month.month)
    )).sort((a, b) => getMonthIndex(a) - getMonthIndex(b));
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    if (months.length === 0) {
        monthSelect.innerHTML = '<option value="">Немає місяців</option>';
        return;
    }
    const fallbackMonth = months[0];
    const selectedMonth = months.includes(previousValue) ? previousValue : fallbackMonth;
    monthSelect.value = selectedMonth;
}
// Function to update color dropdown
function updateColorSelect(productData) {
    const colorSelect = document.getElementById('colorSelect');
    const previousValue = colorSelect.value;
    const yearSelectValue = parseInt(document.getElementById('yearSelect').value, 10);
    const monthSelectValue = document.getElementById('monthSelect').value;
    colorSelect.innerHTML = '';
    if (Number.isNaN(yearSelectValue) || !monthSelectValue) {
        colorSelect.innerHTML = '<option value="">Немає кольорів</option>';
        return;
    }
    const colors = Array.from(new Set(
        productData.months
            .filter(month => month.year === yearSelectValue && month.month === monthSelectValue)
            .flatMap(month => Object.keys(month.colors))
    )).sort((a, b) => a.localeCompare(b, 'uk'));
    colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
    });
    if (colors.length === 0) {
        colorSelect.innerHTML = '<option value="">Немає кольорів</option>';
        return;
    }
    const fallbackColor = colors[0];
    const selectedColor = colors.includes(previousValue) ? previousValue : fallbackColor;
    colorSelect.value = selectedColor;
}
// Function to update product dropdown
function updateProductSelect() {
    const productSelect = document.getElementById('productSelect');
    productSelect.innerHTML = '';
    if (!salesData.products || salesData.products.length === 0) {
        productSelect.innerHTML = '<option value="">Немає продуктів</option>';
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Немає продуктів у даних</p>';
        console.error('salesData.products is empty or undefined');
        return;
    }
    salesData.products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });
    console.log('Product select updated with', salesData.products.length, 'products');
}
// Function to update chart type dropdown
function updateChartTypes() {
    const productSelect = document.getElementById('productSelect').value;
    const chartTypeSelect = document.getElementById('chartType');
    chartTypeSelect.innerHTML = '<option value="byColor">Продажі та попит за кольорами</option>';
    const productData = salesData.products.find(p => p.name === productSelect);
    if (!productData) {
        console.error('No product data for', productSelect);
        return;
    }
    const colors = getProductColors(productData);
    colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = `Розміри для ${color}`;
        chartTypeSelect.appendChild(option);
    });
    console.log('Chart types updated with', colors.length, 'colors');
}
// Function to update charts based on selection
function updateChart() {
    const productSelect = document.getElementById('productSelect').value;
    const chartType = document.getElementById('chartType').value;
    const salesChartTitle = document.getElementById('salesChartTitle');
    const dailyDemandChartTitle = document.getElementById('dailyDemandChartTitle');
    const productData = salesData.products.find(p => p.name === productSelect);
    if (!productData) {
        salesChartTitle.textContent = 'Дані недоступні';
        dailyDemandChartTitle.textContent = 'Дані недоступні';
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Вибраний продукт не знайдено</p>';
        document.getElementById('weeklyDemandList').innerHTML = '';
        console.error('Product not found:', productSelect);
        return;
    }
    const selectedYear = getSelectedYear();
    const filteredMonths = selectedYear === null
        ? productData.months
        : productData.months.filter(month => month.year === selectedYear);
    if (filteredMonths.length === 0) {
        salesChartTitle.textContent = `Немає даних для ${productSelect} у ${selectedYear} році`;
        dailyDemandChartTitle.textContent = `Немає даних для ${productSelect} у ${selectedYear} році`;
        if (salesChart) {
            salesChart.destroy();
            salesChart = null;
        }
        if (dailyDemandChart) {
            dailyDemandChart.destroy();
            dailyDemandChart = null;
        }
        document.getElementById('totalSales').innerHTML = '<p>Немає даних для вибраного року</p>';
        return;
    }
    const colors = getProductColors(productData, filteredMonths);
    const months = filteredMonths.map(m => `${m.month} ${m.year}`);
    const productSizes = getProductSizes(productData);
    let salesDatasets = [];
    if (chartType === 'byColor') {
        salesDatasets = colors.map(color => {
            const data = filteredMonths.map(month => {
                return month.colors[color] ? month.colors[color].reduce((sum, item) => sum + item.quantity, 0) : 0;
            });
            return {
                label: color,
                data: data,
                backgroundColor: getColor(color),
                borderColor: getColor(color),
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 0.9
            };
        });
        const titleSuffix = selectedYear ? ` (${selectedYear} рік)` : '';
        salesChartTitle.textContent = `Продажі за кольорами для ${productSelect}${titleSuffix}`;
        dailyDemandChartTitle.textContent = `Щоденний попит за кольорами для ${productSelect}${titleSuffix}`;
    } else {
        salesDatasets = productSizes.map(size => {
            const data = filteredMonths.map(month => {
                const colorData = month.colors[chartType];
                const item = colorData ? colorData.find(i => i.size === size) : null;
                return item ? item.quantity : 0;
            });
            return {
                label: size,
                data: data,
                backgroundColor: getColor(size),
                borderColor: getColor(size),
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 0.9
            };
        });
        const titleSuffix = selectedYear ? ` (${selectedYear} рік)` : '';
        salesChartTitle.textContent = `Продажі за розмірами для кольору ${chartType} (${productSelect})${titleSuffix}`;
        dailyDemandChartTitle.textContent = `Щоденний попит за розмірами для кольору ${chartType} (${productSelect})${titleSuffix}`;
    }
    // Update total sales
    updateTotalSales(salesDatasets);
    // Update sales chart
    if (salesChart) {
        salesChart.destroy();
    }
    salesChart = new Chart(document.getElementById('salesChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: salesDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Кількість продажів'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Місяці'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
    // Update daily demand chart
    const dailyDemandDatasets = calculateDailyDemandData(productData, filteredMonths, chartType);
    if (dailyDemandChart) {
        dailyDemandChart.destroy();
    }
    dailyDemandChart = new Chart(document.getElementById('dailyDemandChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: dailyDemandDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Щоденний попит (одиниць)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Місяці'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    formatter: (value) => value > 0 ? value : ''
                }
            }
        }
    });
    console.log('Charts updated for', productSelect, 'with type', chartType);
}
// Function to initialize
function init() {
    console.log('Init started. salesData:', salesData ? 'defined' : 'undefined');
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
        console.log('ChartDataLabels registered');
    } else {
        console.warn('ChartDataLabels not loaded');
    }
    updateProductSelect();
    updateChartTypes();
    const productData = salesData.products[0]; // Ініціалізуємо першим продуктом
    if (productData) {
        updateYearSelect(productData);
        updateMonthSelect(productData);
        updateColorSelect(productData);
        updateWeeklyDemand(productData);
    }
    updateChart();
    document.getElementById('productSelect').addEventListener('change', () => {
        updateChartTypes();
        const productData = salesData.products.find(p => p.name === document.getElementById('productSelect').value);
        updateYearSelect(productData);
        updateMonthSelect(productData);
        updateColorSelect(productData);
        updateWeeklyDemand(productData);
        updateChart();
    });
    document.getElementById('chartType').addEventListener('change', () => {
        updateChart();
    });
    document.getElementById('yearSelect').addEventListener('change', () => {
        const productData = salesData.products.find(p => p.name === document.getElementById('productSelect').value);
        updateMonthSelect(productData);
        updateColorSelect(productData);
        updateWeeklyDemand(productData);
        updateChart();
    });
    document.getElementById('monthSelect').addEventListener('change', () => {
        const productData = salesData.products.find(p => p.name === document.getElementById('productSelect').value);
        updateColorSelect(productData);
        updateWeeklyDemand(productData);
    });
    document.getElementById('colorSelect').addEventListener('change', () => {
        const productData = salesData.products.find(p => p.name === document.getElementById('productSelect').value);
        updateWeeklyDemand(productData);
    });
}
// Run after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof salesData === 'undefined') {
        console.error('salesData is not defined. Please ensure it is loaded.');
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Дані не завантажено</p>';
        return;
    }
    init();
});
// Resize charts on window resize
window.addEventListener('resize', () => {
    if (salesChart) salesChart.resize();
    if (dailyDemandChart) dailyDemandChart.resize();
});