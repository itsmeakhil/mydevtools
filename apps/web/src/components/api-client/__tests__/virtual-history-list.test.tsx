// Approach: mock react-window so List calls rowComponent once with index:0, style:{}.
// This lets us assert that renderRow is invoked without @testing-library/react (not installed).
// The virtualization cap (renders << total items) is validated at the integration level.

jest.mock("react-window", () => {
    const React = require("react")
    return {
        List: ({ rowComponent: RowComponent, rowProps, rowCount }: {
            rowComponent: React.ComponentType<{ ariaAttributes: object; index: number; style: React.CSSProperties } & typeof rowProps>
            rowProps: Record<string, unknown>
            rowCount: number
            rowHeight: number
            style?: React.CSSProperties
            defaultHeight?: number
        }) => {
            if (rowCount === 0) return null
            return React.createElement(RowComponent, {
                ariaAttributes: { "aria-posinset": 1, "aria-setsize": rowCount, role: "listitem" },
                index: 0,
                style: {},
                ...rowProps,
            })
        },
    }
})

describe("VirtualHistoryList", () => {
    it("is a React.memo component", () => {
        const { VirtualHistoryList } = require("../collections/virtual-history-list")
        expect(VirtualHistoryList.$$typeof).toBe(Symbol.for("react.memo"))
    })

    it("calls renderRow with the first item and a style object", () => {
        const React = require("react")
        const ReactDOM = require("react-dom/server")
        const { VirtualHistoryList } = require("../collections/virtual-history-list")

        const item: import("../types").HistoryRequest = {
            id: "1",
            name: "Test",
            method: "GET",
            url: "https://example.com",
            params: [],
            headers: [],
            body: { type: "none", content: "" },
            auth: { type: "none" },
            timestamp: 1000,
        }

        const renderRow = jest.fn((_item: unknown, style: React.CSSProperties) =>
            React.createElement("div", { style }, "row")
        )

        ReactDOM.renderToStaticMarkup(
            React.createElement(VirtualHistoryList, {
                items: [item],
                height: 400,
                onSelect: () => {},
                onDelete: () => {},
                renderRow,
            })
        )

        expect(renderRow).toHaveBeenCalledTimes(1)
        expect(renderRow).toHaveBeenCalledWith(item, {})
    })

    it("renders nothing when items array is empty", () => {
        const React = require("react")
        const ReactDOM = require("react-dom/server")
        const { VirtualHistoryList } = require("../collections/virtual-history-list")

        const renderRow = jest.fn()

        ReactDOM.renderToStaticMarkup(
            React.createElement(VirtualHistoryList, {
                items: [],
                height: 400,
                onSelect: () => {},
                onDelete: () => {},
                renderRow,
            })
        )

        expect(renderRow).not.toHaveBeenCalled()
    })
})
