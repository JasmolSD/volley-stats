export default function FileUpload({ onUpload }) {
    return (
        <div style={{ border: "1px dashed #999", padding: 20, borderRadius: 12 }}>
            <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                }}
            />
        </div>
    );
}
