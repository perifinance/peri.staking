// import original module declarations
import 'styled-components';

// and extend them!
declare module 'styled-components' {
    export interface DefaultTheme {
        colors: {
            background: {
                body: string,
                aside: string,
                panel: string,
                button: {
                    primary: string,
                    secondary: string,
                    tertiary: string,
                    fourth: string,
                },
                reFresh: string,
                THeader: string,
                input: {
                    primary: string,
                    secondary: string
                }
            },
            border: {
                primary: string,
                secondary: string,
                tertiary: string,
                barChart: string,
                tableRow: string,
            },
            hover: {
                panel: string,
            },
            link: {
                active: string,
            },
            font: {
                primary: string,
                secondary: string,
                tertiary: string,
                fourth: string,
                fifth: string,
            },
            barChart: {
                primary: string,
                secondary: string,
                warning: string
            },
            table: {
                tHeader: string
            }
        };
    }
}