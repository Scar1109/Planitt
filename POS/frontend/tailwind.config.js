/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                surface: '#f4f7fb',
                ink: '#0f172a',
                // Overriding the default indigo class entirely so the whole app adapts automatically to the #22C9B7 brand
                indigo: {
                    50: '#EAF9F8',
                    100: '#CCF1EC',
                    200: '#9EE2DA',
                    300: '#62CCC1',
                    400: '#31B0A6',
                    500: '#22c9b7',
                    600: '#1CA394',
                    700: '#168074',
                    800: '#14655D',
                    900: '#12544E',
                    950: '#09312E',
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
