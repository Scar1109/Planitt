/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                surface: '#f4f7fb',
                ink: '#0f172a',
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    500: '#4f46e5',
                    600: '#4338ca',
                    700: '#3730a3',
                },
                accent: '#0ea5a6',
            },
            boxShadow: {
                panel: '0 10px 30px -12px rgba(15, 23, 42, 0.18)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
