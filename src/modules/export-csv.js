export function exportCsv(
    filename,
    rows
){

    if(!rows.length){

        console.log(
            "没有报告数据"
        );

        return;

    }


    const headers =
        Object.keys(rows[0]);


    const csv = [

        headers.join(","),

        ...rows.map(row =>

            headers.map(key => {

                const value =
                    row[key] ?? "";

                return `"${String(value).replace(/"/g,'""')}"`;

            }).join(",")

        )

    ].join("\n");


    const blob =
        new Blob(
            [
                "\uFEFF" + csv
            ],
            {
                type:
                "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        filename;


    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);


    URL.revokeObjectURL(url);


    console.log(
        "📄 CSV已导出:",
        filename
    );

}