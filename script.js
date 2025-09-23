import { salesData } from './sales-data.js';

let salesChart, weeklyDemandChart;
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

function formatNumber(value, decimals = 0) {
    const factor = Math.pow(10, decimals);
    let rounded = Math.round(value * factor) / factor;
    if (Object.is(rounded, -0)) {
        rounded = 0;
    }
    if (decimals > 0) {
        return rounded
            .toFixed(decimals)
            .replace(/\.0+$/, '')
            .replace(/(\.\d*[1-9])0+$/, '$1');
    }
    return rounded.toString();
}

function formatDelta(delta, decimals = 0) {
    if (delta === null || typeof delta === 'undefined') {
        return '';
    }
    const factor = Math.pow(10, decimals);
    let roundedDelta = Math.round(delta * factor) / factor;
    if (Object.is(roundedDelta, -0)) {
        roundedDelta = 0;
    }
    const sign = roundedDelta > 0 ? '+' : '';
    const className = roundedDelta > 0 ? 'positive' : roundedDelta < 0 ? 'negative' : 'neutral';
    const formatted = decimals > 0
        ? formatNumber(roundedDelta, decimals)
        : formatNumber(roundedDelta, 0);
    return `<span class="diff ${className}">(${sign}${formatted})</span>`;
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

function deduplicateProducts(products) {
    const productMap = new Map();
    products.forEach(product => {
        if (!productMap.has(product.name)) {
            productMap.set(product.name, {
                name: product.name,
                months: []
            });
        }
        const mergedProduct = productMap.get(product.name);
        product.months.forEach(month => {
            const existingMonth = mergedProduct.months.find(
                m => m.year === month.year && m.month === month.month
            );
            if (!existingMonth) {
                mergedProduct.months.push({
                    month: month.month,
                    year: month.year,
                    colors: Object.fromEntries(
                        Object.entries(month.colors).map(([color, sizes]) => [
                            color,
                            sizes.map(item => ({ ...item }))
                        ])
                    )
                });
            } else {
                Object.entries(month.colors).forEach(([color, sizes]) => {
                    if (!existingMonth.colors[color]) {
                        existingMonth.colors[color] = sizes.map(item => ({ ...item }));
                    } else {
                        const sizeMap = new Map(
                            existingMonth.colors[color].map(item => [item.size, item.quantity])
                        );
                        sizes.forEach(item => {
                            sizeMap.set(item.size, (sizeMap.get(item.size) || 0) + item.quantity);
                        });
                        existingMonth.colors[color] = Array.from(sizeMap, ([size, quantity]) => ({
                            size,
                            quantity
                        }));
                    }
                });
            }
        });
        mergedProduct.months.sort((a, b) => {
            if (a.year !== b.year) {
                return a.year - b.year;
            }
            return getMonthIndex(a.month) - getMonthIndex(b.month);
        });
    });
    return Array.from(productMap.values());
}

const normalizedProducts = deduplicateProducts(salesData.products);

function getProductByName(name) {
    return normalizedProducts.find(product => product.name === name) || null;
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
function updateTotalSales(productData, filteredMonths, chartType, datasets) {
    const totalSalesDiv = document.getElementById('totalSales');
    let html = '<h3>Загальні суми продажів:</h3><ul>';
    const selectedYear = filteredMonths.length > 0 ? filteredMonths[0].year : null;
    const previousYear = selectedYear !== null ? selectedYear - 1 : null;
    const monthNames = filteredMonths.map(month => month.month);
    const previousYearMonths = previousYear !== null
        ? productData.months.filter(month => month.year === previousYear && monthNames.includes(month.month))
        : [];
    const hasPreviousData = previousYearMonths.length > 0;
    datasets.forEach(dataset => {
        const total = calculateTotalSales(dataset.data);
        const label = dataset.label.split(' (Щотижневий)')[0];
        const color = getColor(label);
        let previousTotal = 0;
        if (hasPreviousData) {
            if (chartType === 'byColor') {
                previousTotal = previousYearMonths.reduce((sum, month) => {
                    const colorData = month.colors[label];
                    if (!colorData) {
                        return sum;
                    }
                    return sum + colorData.reduce((acc, item) => acc + item.quantity, 0);
                }, 0);
            } else {
                previousTotal = previousYearMonths.reduce((sum, month) => {
                    const colorData = month.colors[chartType];
                    if (!colorData) {
                        return sum;
                    }
                    const item = colorData.find(i => i.size === label);
                    return sum + (item ? item.quantity : 0);
                }, 0);
            }
        }
        const diffHtml = hasPreviousData ? formatDelta(total - previousTotal) : '';
        html += `<li><span class="label"><span class="color-square" style="background-color: ${color};"></span>${label}</span><span class="value">${total}${diffHtml ? ` ${diffHtml}` : ''}</span></li>`;
    });
    html += '</ul>';
    totalSalesDiv.innerHTML = html;
}
// Function to update daily demand text display
function updateDailyDemandSummary(productData) {
    const dailyDemandList = document.getElementById('dailyDemandList');
    const yearSelect = parseInt(document.getElementById('yearSelect').value, 10);
    const monthSelect = document.getElementById('monthSelect').value;
    const colorSelect = document.getElementById('colorSelect').value;
    let html = '';
    if (Number.isNaN(yearSelect) || !monthSelect || !colorSelect) {
        html = '<p>Немає даних для вибраного року, місяця або кольору</p>';
        dailyDemandList.innerHTML = html;
        return;
    }
    const month = productData.months.find(m => m.year === yearSelect && m.month === monthSelect);
    if (!month || !month.colors[colorSelect]) {
        html = '<p>Немає даних для вибраного року, місяця або кольору</p>';
        dailyDemandList.innerHTML = html;
        return;
    }
    const colorHex = getColor(colorSelect);
    const productSizes = getProductSizes(productData);
    const daysInMonth = getDaysInMonth(month.month, month.year);
    const previousYearForMonth = month.year - 1;
    const previousMonth = productData.months.find(
        m => m.year === previousYearForMonth && m.month === month.month
    ) || null;
    const previousDaysInMonth = previousMonth ? getDaysInMonth(previousMonth.month, previousMonth.year) : null;
    let totalDaily = 0;
    let totalPreviousDaily = 0;
    const previousYear = month.year - 1;
    const previousMonth = productData.months.find(m => m.year === previousYear && m.month === month.month) || null;
    const previousDaysInMonth = previousMonth ? getDaysInMonth(previousMonth.month, previousMonth.year) : null;
    let totalDaily = 0;
    let totalPreviousDaily = 0;
    const weeksInMonth = daysInMonth / 7;
    const previousYear = month.year - 1;
    const previousMonth = productData.months.find(m => m.year === previousYear && m.month === month.month) || null;
    const previousWeeksInMonth = previousMonth ? getDaysInMonth(previousMonth.month, previousMonth.year) / 7 : null;
    let totalWeekly = 0; // Для пункту "Усього"
    let totalPreviousWeekly = 0;
    html += `<h4><span class="color-square" style="background-color: ${colorHex};"></span>${colorSelect}</h4>`;
    html += '<ul class="fade-in">';
    productSizes.forEach(size => {
        const colorData = month.colors[colorSelect];
        const item = colorData ? colorData.find(i => i.size === size) : null;
        const total = item ? item.quantity : 0;
        const daily = Math.round((total / daysInMonth) * 10) / 10;
        let previousDaily = null;
        if (previousMonth && previousDaysInMonth) {
            const previousColorData = previousMonth.colors[colorSelect] || [];
            const previousItem = previousColorData.find(i => i.size === size) || null;
            const previousTotal = previousItem ? previousItem.quantity : 0;
            previousDaily = Math.round((previousTotal / previousDaysInMonth) * 10) / 10;
        }
        if (previousDaily !== null) {
            totalPreviousDaily += previousDaily;
        }
        if (daily > 0) {
            const diffHtml = previousDaily !== null ? formatDelta(daily - previousDaily, 1) : '';
            html += `<li class="fade-in"><span class="label">${size}</span><span class="value">${daily}${diffHtml ? ` ${diffHtml}` : ''}</span></li>`;
        }
        totalDaily += daily;
    });
    totalDaily = Math.round(totalDaily * 10) / 10;
    totalPreviousDaily = Math.round(totalPreviousDaily * 10) / 10;
    const totalDiffHtml = previousMonth && previousDaysInMonth ? formatDelta(totalDaily - totalPreviousDaily, 1) : '';
    html += `<li class="fade-in"><span class="label">Усього</span><span class="value">${totalDaily}${totalDiffHtml ? ` ${totalDiffHtml}` : ''}</span></li>`;
        }
        totalDaily += daily;
    });
    totalDaily = Math.round(totalDaily * 10) / 10;
    totalPreviousDaily = Math.round(totalPreviousDaily * 10) / 10;
    const totalDiffHtml = previousMonth && previousDaysInMonth ? formatDelta(totalDaily - totalPreviousDaily, 1) : '';
    html += `<li class="fade-in"><span class="label">Усього</span><span class="value">${totalDaily}${totalDiffHtml ? ` ${totalDiffHtml}` : ''}</span></li>`;
        const weekly = Math.round(total / weeksInMonth * 10) / 10;
        let previousWeekly = null;
        if (previousMonth && previousWeeksInMonth) {
            const previousColorData = previousMonth.colors[colorSelect] || [];
            const previousItem = previousColorData.find(i => i.size === size) || null;
            const previousTotal = previousItem ? previousItem.quantity : 0;
            previousWeekly = Math.round(previousTotal / previousWeeksInMonth * 10) / 10;
        }
        if (previousWeekly !== null) {
            totalPreviousWeekly += previousWeekly;
        }
        if (weekly > 0) {
            const diffHtml = previousWeekly !== null ? formatDelta(weekly - previousWeekly, 1) : '';
            html += `<li class="fade-in"><span class="label">${size}</span><span class="value">${weekly}${diffHtml ? ` ${diffHtml}` : ''}</span></li>`;
        }
        totalWeekly += weekly;
    });
    totalWeekly = Math.round(totalWeekly * 10) / 10; // Округлення до 1 знака
    totalPreviousWeekly = Math.round(totalPreviousWeekly * 10) / 10;
    const totalDiffHtml = previousMonth && previousWeeksInMonth ? formatDelta(totalWeekly - totalPreviousWeekly, 1) : '';
    html += `<li class="fade-in"><span class="label">Усього</span><span class="value">${totalWeekly}${totalDiffHtml ? ` ${totalDiffHtml}` : ''}</span></li>`;
    html += '</ul>';
    dailyDemandList.innerHTML = html;
    setTimeout(() => {
        const ul = dailyDemandList.querySelector('ul');
        if (ul) ul.classList.remove('fade-in');
        const lis = dailyDemandList.querySelectorAll('li');
        lis.forEach(li => li.classList.remove('fade-in'));
    }, 500);
}
// Function to calculate weekly demand data
function calculateWeeklyDemandData(productData, months, chartType) {
// Function to calculate daily demand data
function calculateDailyDemandData(productData, months, chartType) {
    const datasets = [];
    const productSizes = getProductSizes(productData);
    if (chartType === 'byColor') {
        const colors = getProductColors(productData, months);
        colors.forEach(color => {
            const data = months.map(month => {
                const daysInMonth = getDaysInMonth(month.month, month.year);
                const weeksInMonth = daysInMonth / 7;
                const total = month.colors[color] ? month.colors[color].reduce((sum, item) => sum + item.quantity, 0) : 0;
                return Math.round((total / weeksInMonth) * 10) / 10;
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
                const weeksInMonth = daysInMonth / 7;
                const colorData = month.colors[color];
                const item = colorData ? colorData.find(i => i.size === size) : null;
                const total = item ? item.quantity : 0;
                return Math.round((total / weeksInMonth) * 10) / 10;
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
    if (!normalizedProducts || normalizedProducts.length === 0) {
        productSelect.innerHTML = '<option value="">Немає продуктів</option>';
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Немає продуктів у даних</p>';
        console.error('normalizedProducts is empty or undefined');
        return;
    }
    normalizedProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.name;
        option.textContent = product.name;
        productSelect.appendChild(option);
    });
    console.log('Product select updated with', normalizedProducts.length, 'products');
}
// Function to update chart type dropdown
function updateChartTypes() {
    const productSelect = document.getElementById('productSelect').value;
    const chartTypeSelect = document.getElementById('chartType');
    chartTypeSelect.innerHTML = '<option value="byColor">Продажі та попит за кольорами</option>';
    const productData = getProductByName(productSelect);
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
    const weeklyDemandChartTitle = document.getElementById('weeklyDemandChartTitle');
    const dailyDemandChartTitle = document.getElementById('dailyDemandChartTitle');
    const productData = getProductByName(productSelect);
    if (!productData) {
        salesChartTitle.textContent = 'Дані недоступні';
        weeklyDemandChartTitle.textContent = 'Дані недоступні';
        document.getElementById('totalSales').innerHTML = '<p style="color: red;">Помилка: Вибраний продукт не знайдено</p>';
        document.getElementById('dailyDemandList').innerHTML = '';
        console.error('Product not found:', productSelect);
        return;
    }
    const selectedYear = getSelectedYear();
    const filteredMonths = selectedYear === null
        ? productData.months
        : productData.months.filter(month => month.year === selectedYear);
    if (filteredMonths.length === 0) {
        salesChartTitle.textContent = `Немає даних для ${productSelect} у ${selectedYear} році`;
        weeklyDemandChartTitle.textContent = `Немає даних для ${productSelect} у ${selectedYear} році`;
        dailyDemandChartTitle.textContent = `Немає даних для ${productSelect} у ${selectedYear} році`;
        if (salesChart) {
            salesChart.destroy();
            salesChart = null;
        }
        if (weeklyDemandChart) {
            weeklyDemandChart.destroy();
            weeklyDemandChart = null;
        }
        document.getElementById('totalSales').innerHTML = '<p>Немає даних для вибраного року</p>';
        document.getElementById('dailyDemandList').innerHTML = '<p>Немає даних для вибраного року</p>';
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
        weeklyDemandChartTitle.textContent = `Щотижневий попит за кольорами для ${productSelect}${titleSuffix}`;
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
        weeklyDemandChartTitle.textContent = `Щотижневий попит за розмірами для кольору ${chartType} (${productSelect})${titleSuffix}`;
        dailyDemandChartTitle.textContent = `Щоденний попит за розмірами для кольору ${chartType} (${productSelect})${titleSuffix}`;
    }
    // Update total sales
    updateTotalSales(productData, filteredMonths, chartType, salesDatasets);
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
    const weeklyDemandDatasets = calculateWeeklyDemandData(productData, filteredMonths, chartType);
    if (weeklyDemandChart) {
        weeklyDemandChart.destroy();
    const dailyDemandDatasets = calculateDailyDemandData(productData, filteredMonths, chartType);
    if (dailyDemandChart) {
        dailyDemandChart.destroy();
    }
    weeklyDemandChart = new Chart(document.getElementById('weeklyDemandChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: months,
            datasets: weeklyDemandDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Щотижневий попит (одиниць)'
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
    const productData = normalizedProducts[0]; // Ініціалізуємо першим продуктом
    if (productData) {
        updateYearSelect(productData);
        updateMonthSelect(productData);
        updateColorSelect(productData);
        updateDailyDemandSummary(productData);
    }
    updateChart();
    document.getElementById('productSelect').addEventListener('change', () => {
        updateChartTypes();
        const productData = getProductByName(document.getElementById('productSelect').value);
        if (!productData) {
            console.error('Product not found for selection change');
            return;
        }
        updateYearSelect(productData);
        updateMonthSelect(productData);
        updateColorSelect(productData);
        updateDailyDemandSummary(productData);
        updateChart();
    });
    document.getElementById('chartType').addEventListener('change', () => {
        updateChart();
    });
    document.getElementById('yearSelect').addEventListener('change', () => {
        const productData = getProductByName(document.getElementById('productSelect').value);
        if (!productData) {
            console.error('Product not found when year changed');
            return;
        }
        updateMonthSelect(productData);
        updateColorSelect(productData);
        updateDailyDemandSummary(productData);
        updateWeeklyDemand(productData);
        updateChart();
    });
    document.getElementById('monthSelect').addEventListener('change', () => {
        const productData = getProductByName(document.getElementById('productSelect').value);
        if (!productData) {
            console.error('Product not found when month changed');
            return;
        }
        updateColorSelect(productData);
        updateDailyDemandSummary(productData);
    });
    document.getElementById('colorSelect').addEventListener('change', () => {
        const productData = getProductByName(document.getElementById('productSelect').value);
        if (!productData) {
            console.error('Product not found when color changed');
            return;
        }
        updateDailyDemandSummary(productData);
        updateWeeklyDemand(productData);
        updateChart();
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
    if (weeklyDemandChart) weeklyDemandChart.resize();
});