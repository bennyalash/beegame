import React from 'react';

export const Confirmation = ({ cancel, confirm, good, top, onlineHide }) => {

    if (onlineHide) {
        return null;
    }
    return (
        <div className={`confirmation-box${top ? " top" : ""}`}>
                <div className={`dull button-holder${!good ? " hidden" : ""}`}>
                <button onClick={() => cancel()}>Cancel</button>
            </div>
                <div className={`button-holder${!good ? " hidden" : ""}`}>
                <button onClick={() => confirm()}>Confirm</button>
            </div>
    </div>)
}